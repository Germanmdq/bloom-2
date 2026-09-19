-- =====================================================
-- BLOOM: MÓDULO COMPRAS & STOCK - MIGRACIÓN COMPLETA
-- =====================================================
-- Este script crea el nuevo modelo relacional:
-- Proveedores → Insumos → Compras → ComprasDetalle
-- + GastosFijos con alertas de vencimiento
-- =====================================================

-- 1. TABLA PROVEEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.proveedores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    cuit TEXT,
    telefono TEXT,
    email TEXT,
    saldo_cc NUMERIC DEFAULT 0, -- Saldo Cuenta Corriente (positivo = le debemos)
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access proveedores" ON public.proveedores;
CREATE POLICY "Full access proveedores" ON public.proveedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. TABLA INSUMOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.insumos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    unidad TEXT NOT NULL CHECK (unidad IN ('kg', 'g', 'l', 'ml', 'un')),
    stock_actual NUMERIC DEFAULT 0,
    stock_minimo NUMERIC DEFAULT 0,
    precio_ultima_compra NUMERIC DEFAULT 0,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    categoria TEXT DEFAULT 'General', -- Carnicería, Verdulería, Almacén, Lácteos, Panificados, Aderezos, Cafetería, etc.
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access insumos" ON public.insumos;
CREATE POLICY "Full access insumos" ON public.insumos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. TABLA COMPRAS (Cabecera)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    numero_factura TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total NUMERIC DEFAULT 0,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'cuenta_corriente')),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access compras" ON public.compras;
CREATE POLICY "Full access compras" ON public.compras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. TABLA COMPRAS DETALLE (Items de cada compra)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.compras_detalle (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    compra_id UUID REFERENCES public.compras(id) ON DELETE CASCADE,
    insumo_id UUID REFERENCES public.insumos(id) ON DELETE SET NULL,
    cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

ALTER TABLE public.compras_detalle ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access compras_detalle" ON public.compras_detalle;
CREATE POLICY "Full access compras_detalle" ON public.compras_detalle FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. TABLA GASTOS FIJOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gastos_fijos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    monto NUMERIC NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
    categoria TEXT DEFAULT 'general', -- urgente, normal
    recurrente BOOLEAN DEFAULT true,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.gastos_fijos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access gastos_fijos" ON public.gastos_fijos;
CREATE POLICY "Full access gastos_fijos" ON public.gastos_fijos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 6. FUNCIÓN: Registrar compra completa (transaccional)
-- =====================================================
CREATE OR REPLACE FUNCTION public.registrar_compra(
    p_proveedor_id UUID,
    p_numero_factura TEXT,
    p_metodo_pago TEXT,
    p_observaciones TEXT,
    p_items JSONB -- [{insumo_id, cantidad, precio_unitario}]
) RETURNS UUID AS $$
DECLARE
    v_compra_id UUID;
    v_total NUMERIC := 0;
    v_item JSONB;
    v_insumo_id UUID;
    v_cantidad NUMERIC;
    v_precio NUMERIC;
BEGIN
    -- Calcular total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_total := v_total + (v_item->>'cantidad')::NUMERIC * (v_item->>'precio_unitario')::NUMERIC;
    END LOOP;

    -- Insertar cabecera de compra
    INSERT INTO public.compras (proveedor_id, numero_factura, metodo_pago, total, observaciones)
    VALUES (p_proveedor_id, p_numero_factura, p_metodo_pago, v_total, p_observaciones)
    RETURNING id INTO v_compra_id;

    -- Insertar detalle y actualizar stock + precio
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_insumo_id := (v_item->>'insumo_id')::UUID;
        v_cantidad := (v_item->>'cantidad')::NUMERIC;
        v_precio := (v_item->>'precio_unitario')::NUMERIC;

        -- Detalle
        INSERT INTO public.compras_detalle (compra_id, insumo_id, cantidad, precio_unitario)
        VALUES (v_compra_id, v_insumo_id, v_cantidad, v_precio);

        -- Actualizar stock del insumo
        UPDATE public.insumos
        SET stock_actual = stock_actual + v_cantidad,
            precio_ultima_compra = v_precio,
            updated_at = NOW()
        WHERE id = v_insumo_id;
    END LOOP;

    -- Si es cuenta corriente, sumar al saldo del proveedor
    IF p_metodo_pago = 'cuenta_corriente' THEN
        UPDATE public.proveedores
        SET saldo_cc = saldo_cc + v_total,
            updated_at = NOW()
        WHERE id = p_proveedor_id;
    END IF;

    RETURN v_compra_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. SEED: PROVEEDORES INICIALES
-- =====================================================
INSERT INTO public.proveedores (nombre, cuit, telefono) VALUES
('Cabrales', NULL, NULL),
('San Diego', NULL, NULL),
('Casería', NULL, NULL),
('Tapamar', NULL, NULL),
('Bimbo', NULL, NULL),
('Los Pinos', NULL, NULL),
('Carnicería', NULL, NULL),
('Avícola', NULL, NULL),
('Verdulería', NULL, NULL),
('Distribuidora General', NULL, NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. SEED: INSUMOS INICIALES (vinculados a proveedores)
-- =====================================================
-- Nota: Usamos subconsultas para vincular por nombre de proveedor

-- Cabrales
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Café en Grano', 'kg', 0, 10, 'Cafetería', (SELECT id FROM public.proveedores WHERE nombre = 'Cabrales' LIMIT 1)),
('Azúcar', 'kg', 0, 20, 'Cafetería', (SELECT id FROM public.proveedores WHERE nombre = 'Cabrales' LIMIT 1)),
('Edulcorante', 'un', 0, 50, 'Cafetería', (SELECT id FROM public.proveedores WHERE nombre = 'Cabrales' LIMIT 1)),
('Submarino', 'kg', 0, 5, 'Cafetería', (SELECT id FROM public.proveedores WHERE nombre = 'Cabrales' LIMIT 1)),
('Chocolate en Polvo', 'kg', 0, 3, 'Cafetería', (SELECT id FROM public.proveedores WHERE nombre = 'Cabrales' LIMIT 1)),
('Té Surtido', 'un', 0, 100, 'Cafetería', (SELECT id FROM public.proveedores WHERE nombre = 'Cabrales' LIMIT 1));

-- Bimbo
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Rapiditas', 'un', 0, 50, 'Panificados', (SELECT id FROM public.proveedores WHERE nombre = 'Bimbo' LIMIT 1)),
('Pan Lactal', 'un', 0, 20, 'Panificados', (SELECT id FROM public.proveedores WHERE nombre = 'Bimbo' LIMIT 1));

-- Los Pinos
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Pan de Miga', 'un', 0, 20, 'Panificados', (SELECT id FROM public.proveedores WHERE nombre = 'Los Pinos' LIMIT 1)),
('Medialuna Manteca', 'un', 0, 100, 'Panificados', (SELECT id FROM public.proveedores WHERE nombre = 'Los Pinos' LIMIT 1)),
('Medialuna Grasa', 'un', 0, 50, 'Panificados', (SELECT id FROM public.proveedores WHERE nombre = 'Los Pinos' LIMIT 1)),
('Pan Burger Brioche', 'un', 0, 80, 'Panificados', (SELECT id FROM public.proveedores WHERE nombre = 'Los Pinos' LIMIT 1));

-- Carnicería
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Lomo Limpio', 'kg', 0, 5, 'Carnicería', (SELECT id FROM public.proveedores WHERE nombre = 'Carnicería' LIMIT 1)),
('Bife de Chorizo', 'kg', 0, 10, 'Carnicería', (SELECT id FROM public.proveedores WHERE nombre = 'Carnicería' LIMIT 1)),
('Carne Picada Especial', 'kg', 0, 15, 'Carnicería', (SELECT id FROM public.proveedores WHERE nombre = 'Carnicería' LIMIT 1)),
('Bondiola de Cerdo', 'kg', 0, 8, 'Carnicería', (SELECT id FROM public.proveedores WHERE nombre = 'Carnicería' LIMIT 1)),
('Matambre Vacuno', 'kg', 0, 4, 'Carnicería', (SELECT id FROM public.proveedores WHERE nombre = 'Carnicería' LIMIT 1)),
('Panceta Ahumada', 'kg', 0, 5, 'Carnicería', (SELECT id FROM public.proveedores WHERE nombre = 'Carnicería' LIMIT 1));

-- Avícola
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Pollo Entero', 'kg', 0, 20, 'Avícola', (SELECT id FROM public.proveedores WHERE nombre = 'Avícola' LIMIT 1)),
('Pechuga de Pollo', 'kg', 0, 15, 'Avícola', (SELECT id FROM public.proveedores WHERE nombre = 'Avícola' LIMIT 1)),
('Huevo Blanco', 'un', 0, 180, 'Avícola', (SELECT id FROM public.proveedores WHERE nombre = 'Avícola' LIMIT 1));

-- Verdulería
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Papa', 'kg', 0, 100, 'Verdulería', (SELECT id FROM public.proveedores WHERE nombre = 'Verdulería' LIMIT 1)),
('Cebolla', 'kg', 0, 40, 'Verdulería', (SELECT id FROM public.proveedores WHERE nombre = 'Verdulería' LIMIT 1)),
('Tomate', 'kg', 0, 20, 'Verdulería', (SELECT id FROM public.proveedores WHERE nombre = 'Verdulería' LIMIT 1)),
('Lechuga', 'kg', 0, 10, 'Verdulería', (SELECT id FROM public.proveedores WHERE nombre = 'Verdulería' LIMIT 1)),
('Morrón Rojo', 'kg', 0, 5, 'Verdulería', (SELECT id FROM public.proveedores WHERE nombre = 'Verdulería' LIMIT 1)),
('Palta', 'kg', 0, 4, 'Verdulería', (SELECT id FROM public.proveedores WHERE nombre = 'Verdulería' LIMIT 1)),
('Limón', 'kg', 0, 10, 'Verdulería', (SELECT id FROM public.proveedores WHERE nombre = 'Verdulería' LIMIT 1)),
('Zanahoria', 'kg', 0, 15, 'Verdulería', (SELECT id FROM public.proveedores WHERE nombre = 'Verdulería' LIMIT 1));

-- San Diego (Distribuidora)
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Aceite Girasol', 'l', 0, 40, 'Almacén', (SELECT id FROM public.proveedores WHERE nombre = 'San Diego' LIMIT 1)),
('Aceite Oliva', 'l', 0, 10, 'Almacén', (SELECT id FROM public.proveedores WHERE nombre = 'San Diego' LIMIT 1)),
('Harina 0000', 'kg', 0, 50, 'Almacén', (SELECT id FROM public.proveedores WHERE nombre = 'San Diego' LIMIT 1)),
('Arroz', 'kg', 0, 20, 'Almacén', (SELECT id FROM public.proveedores WHERE nombre = 'San Diego' LIMIT 1)),
('Fideos', 'kg', 0, 10, 'Almacén', (SELECT id FROM public.proveedores WHERE nombre = 'San Diego' LIMIT 1)),
('Sal Fina', 'kg', 0, 10, 'Almacén', (SELECT id FROM public.proveedores WHERE nombre = 'San Diego' LIMIT 1));

-- Casería (Lácteos)
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Leche Entera', 'l', 0, 60, 'Lácteos', (SELECT id FROM public.proveedores WHERE nombre = 'Casería' LIMIT 1)),
('Crema de Leche', 'l', 0, 10, 'Lácteos', (SELECT id FROM public.proveedores WHERE nombre = 'Casería' LIMIT 1)),
('Manteca', 'kg', 0, 10, 'Lácteos', (SELECT id FROM public.proveedores WHERE nombre = 'Casería' LIMIT 1)),
('Queso Muzzarella', 'kg', 0, 30, 'Lácteos', (SELECT id FROM public.proveedores WHERE nombre = 'Casería' LIMIT 1)),
('Queso Cheddar', 'kg', 0, 5, 'Lácteos', (SELECT id FROM public.proveedores WHERE nombre = 'Casería' LIMIT 1)),
('Queso Crema', 'kg', 0, 10, 'Lácteos', (SELECT id FROM public.proveedores WHERE nombre = 'Casería' LIMIT 1)),
('Jamón Cocido', 'kg', 0, 15, 'Lácteos', (SELECT id FROM public.proveedores WHERE nombre = 'Casería' LIMIT 1));

-- Tapamar (Fiambres / Aderezos)
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Mayonesa', 'kg', 0, 5, 'Aderezos', (SELECT id FROM public.proveedores WHERE nombre = 'Tapamar' LIMIT 1)),
('Mostaza', 'kg', 0, 3, 'Aderezos', (SELECT id FROM public.proveedores WHERE nombre = 'Tapamar' LIMIT 1)),
('Ketchup', 'kg', 0, 3, 'Aderezos', (SELECT id FROM public.proveedores WHERE nombre = 'Tapamar' LIMIT 1)),
('Dulce de Leche', 'kg', 0, 10, 'Aderezos', (SELECT id FROM public.proveedores WHERE nombre = 'Tapamar' LIMIT 1));

-- Distribuidora General (extras)
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria, proveedor_id) VALUES
('Servilletas', 'un', 0, 500, 'Descartables', (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora General' LIMIT 1)),
('Vasos Descartables', 'un', 0, 200, 'Descartables', (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora General' LIMIT 1)),
('Film Transparente', 'un', 0, 5, 'Descartables', (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora General' LIMIT 1)),
('Bolsas Delivery', 'un', 0, 100, 'Descartables', (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora General' LIMIT 1));

-- =====================================================
-- 9. SEED: GASTOS FIJOS PROGRAMADOS
-- =====================================================
-- Usamos el mes actual como referencia para fechas de vencimiento

INSERT INTO public.gastos_fijos (nombre, monto, fecha_vencimiento, estado, categoria) VALUES
('Alquiler', 2000000, (date_trunc('month', CURRENT_DATE) + INTERVAL '4 days')::DATE, 'pendiente', 'urgente'),
('Luz', 1000000, (date_trunc('month', CURRENT_DATE) + INTERVAL '9 days')::DATE, 'pendiente', 'urgente'),
('Sueldo Carla', 6875000, (date_trunc('month', CURRENT_DATE) + INTERVAL '4 days')::DATE, 'pendiente', 'urgente'),
('Sueldo Alina', 6875000, (date_trunc('month', CURRENT_DATE) + INTERVAL '4 days')::DATE, 'pendiente', 'urgente'),
('Expensas', 248000, (date_trunc('month', CURRENT_DATE) + INTERVAL '14 days')::DATE, 'pendiente', 'normal'),
('Contador', 700000, (date_trunc('month', CURRENT_DATE) + INTERVAL '9 days')::DATE, 'pendiente', 'normal'),
('Tasas Municipales', 0, (date_trunc('month', CURRENT_DATE) + INTERVAL '14 days')::DATE, 'pendiente', 'normal'),
('OSSE (Agua)', 0, (date_trunc('month', CURRENT_DATE) + INTERVAL '19 days')::DATE, 'pendiente', 'normal'),
('Gas', 0, (date_trunc('month', CURRENT_DATE) + INTERVAL '14 days')::DATE, 'pendiente', 'normal'),
('Contenedor', 0, (date_trunc('month', CURRENT_DATE) + INTERVAL '14 days')::DATE, 'pendiente', 'normal');

-- =====================================================
-- 10. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_insumos_proveedor ON public.insumos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON public.compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra ON public.compras_detalle(compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_insumo ON public.compras_detalle(insumo_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_estado ON public.gastos_fijos(estado);
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_vencimiento ON public.gastos_fijos(fecha_vencimiento);
