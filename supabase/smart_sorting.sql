-- ALGORITMO DE ORDENAMIENTO INTELIGENTE
-- Este script permite que las categorías se ordenen automáticamente por popularidad (ventas).

BEGIN;

-- 1. Agregar campo de conteo de ventas a categorías
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sales_count BIGINT DEFAULT 0;

-- 2. Función Inteligente: Lee cada orden nueva y suma puntos a las categorías correspondientes
CREATE OR REPLACE FUNCTION public.update_category_sales_count()
RETURNS TRIGGER AS $$
DECLARE
    item jsonb;
    prod_cat_id uuid;
    qty int;
BEGIN
    -- Iterar sobre los items de la orden (JSON)
    -- Estructura esperada: [{"name": "X", "quantity": 1}, ...]
    IF NEW.items IS NOT NULL THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            -- Buscar categoría del producto por nombre
            SELECT category_id INTO prod_cat_id FROM public.products WHERE name = (item->>'name') LIMIT 1;
            
            IF prod_cat_id IS NOT NULL THEN
                qty := COALESCE((item->>'quantity')::int, 1);
                -- Sumar ventas a la categoría
                UPDATE public.categories SET sales_count = COALESCE(sales_count, 0) + qty WHERE id = prod_cat_id;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Activar el Trigger en la tabla de Órdenes
DROP TRIGGER IF EXISTS trg_update_sales_count ON public.orders;

CREATE TRIGGER trg_update_sales_count
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_category_sales_count();

COMMIT;
