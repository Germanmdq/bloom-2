-- ================================================================
-- BLOOM: DESCUENTO AUTOMÁTICO DE STOCK POR VENTA
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- PASO 1: Agregar columna idempotencia en orders
-- (evita descontar stock dos veces si se edita la orden)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT FALSE;

-- ================================================================
-- PASO 2: FUNCIÓN TRIGGER - Descuenta stock al cobrar
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_deduct_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_item          JSONB;
    v_product_id    UUID;
    v_quantity      NUMERIC;
    v_recipe        RECORD;
BEGIN
    -- Solo actúa cuando el status pasa a 'paid' o 'completed' y no fue descontado antes
    IF (lower(NEW.status) IN ('paid', 'completed') AND (OLD.status IS NULL OR lower(OLD.status) NOT IN ('paid', 'completed')) AND NEW.stock_deducted IS NOT TRUE) THEN

        -- Recorrer cada item del pedido
        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP

            -- Ignorar items de metadata (como meta-customer)
            CONTINUE WHEN (v_item->>'id') = 'meta-customer';
            CONTINUE WHEN (v_item->>'category') = 'METADATA';

            BEGIN
                v_product_id := (v_item->>'id')::UUID;
            EXCEPTION WHEN OTHERS THEN
                CONTINUE; -- Si el id no es UUID válido, saltear
            END;

            v_quantity := COALESCE((v_item->>'quantity')::NUMERIC, 1);

            -- Buscar receta del producto (comparamos por nombre del producto de menú por si los IDs cambiaron)
            FOR v_recipe IN
                SELECT r.raw_product_id, r.qty, raw_p.name as raw_name
                FROM public.recipes r
                JOIN public.products raw_p ON raw_p.id = r.raw_product_id
                JOIN public.products menu_p ON menu_p.id = r.menu_product_id
                WHERE menu_p.name ILIKE (v_item->>'name')
            LOOP
                -- 1. Insertar movimiento en sistema viejo
                INSERT INTO public.inventory_movements
                    (raw_product_id, qty, reason, ref_table, ref_id)
                VALUES
                    (v_recipe.raw_product_id,
                     -(v_recipe.qty * v_quantity),
                     'sale',
                     'orders',
                     NEW.id)
                ON CONFLICT DO NOTHING;

                -- 2. Actualizar stock en sistema NUEVO (pantalla Compras & Stock)
                -- Compara por nombre (ej: "Café en Grano" descuenta de "Café")
                UPDATE public.insumos s
                SET stock_actual = stock_actual - (v_recipe.qty * v_quantity)
                WHERE v_recipe.raw_name ILIKE '%' || s.nombre || '%'
                   OR s.nombre ILIKE '%' || v_recipe.raw_name || '%';
            END LOOP;

        END LOOP;

        -- Marcar como descontado para idempotencia
        NEW.stock_deducted := TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PASO 3: CREAR TRIGGER en tabla orders
-- ================================================================
DROP TRIGGER IF EXISTS trg_deduct_stock_on_sale ON public.orders;

CREATE TRIGGER trg_deduct_stock_on_sale
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_deduct_stock_on_sale();

-- También para inserciones directas como 'paid'
DROP TRIGGER IF EXISTS trg_deduct_stock_on_insert ON public.orders;

CREATE TRIGGER trg_deduct_stock_on_insert
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    WHEN (lower(NEW.status) IN ('paid', 'completed'))
    EXECUTE FUNCTION public.fn_deduct_stock_on_sale();


-- ================================================================
-- PASO 4: CARGAR 10 UNIDADES en cada insumo (raw product)
-- para que puedas probar el descuento
-- ================================================================
INSERT INTO public.inventory_movements (raw_product_id, qty, reason)
SELECT
    id,
    10,
    'purchase'
FROM public.products
WHERE kind = 'raw'
  AND track_stock = TRUE
ON CONFLICT DO NOTHING;

-- ================================================================
-- VERIFICACIÓN: Ver stock actual después de la carga
-- ================================================================
SELECT
    p.name,
    p.unit,
    COALESCE(SUM(m.qty), 0) AS stock_actual
FROM public.products p
LEFT JOIN public.inventory_movements m ON m.raw_product_id = p.id
WHERE p.kind = 'raw'
GROUP BY p.id, p.name, p.unit
ORDER BY p.name;
