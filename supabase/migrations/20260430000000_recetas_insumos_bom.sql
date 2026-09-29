-- ================================================
-- BLOOM: RECETARIO COMPLETO (BOM) EN UNIDADES
-- 2026-04-30
-- ================================================
-- Descuenta insumos al cobrar con Efectivo, Transferencia
-- o Cuenta Corriente. No requiere comanda/ticket de cocina.
-- ================================================

BEGIN;

-- ──────────────────────────────────────────────
-- 1. TABLA recetas_insumos
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recetas_insumos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    insumo_id       UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    qty             NUMERIC NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(menu_product_id, insumo_id)
);

ALTER TABLE public.recetas_insumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recetas_insumos_all" ON public.recetas_insumos;
CREATE POLICY "recetas_insumos_all" ON public.recetas_insumos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────
-- 2. INSUMOS EN UNIDADES (UN)
-- Cada uno representa una porción/dosis/unidad de servicio.
-- WHERE NOT EXISTS evita duplicados sin necesitar constraint único.
-- ──────────────────────────────────────────────

-- ☕ CAFETERÍA
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Café en Grano (dosis)', 'un', 0, 100, 'Cafetería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Café en Grano (dosis)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Azúcar/Edulcorante (sobre)', 'un', 0, 200, 'Cafetería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Azúcar/Edulcorante (sobre)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Leche (medida)', 'un', 0, 100, 'Cafetería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Leche (medida)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Crema (porción)', 'un', 0, 50, 'Cafetería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Crema (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Cacao (porción)', 'un', 0, 50, 'Cafetería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Cacao (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Saquito de Té/Mate', 'un', 0, 100, 'Cafetería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Saquito de Té/Mate');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Submarino (barra)', 'un', 0, 20, 'Cafetería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Submarino (barra)');

-- 🥐 PANIFICADOS
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pan Lactal/Miga (unidad)', 'un', 0, 50, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pan Lactal/Miga (unidad)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Manteca (individual)', 'un', 0, 100, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Manteca (individual)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Mermelada (individual)', 'un', 0, 100, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Mermelada (individual)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Dulce de Leche (individual)', 'un', 0, 50, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Dulce de Leche (individual)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Factura', 'un', 0, 50, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Factura');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Medialuna Manteca', 'un', 0, 50, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Medialuna Manteca');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Feta Jamón', 'un', 0, 100, 'Fiambres'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Feta Jamón');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Feta Queso', 'un', 0, 100, 'Fiambres'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Feta Queso');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pan Árabe', 'un', 0, 20, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pan Árabe');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Tarta (porción)', 'un', 0, 10, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Tarta (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Lemon Pie (porción)', 'un', 0, 10, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Lemon Pie (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Brownie (porción)', 'un', 0, 20, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Brownie (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Alfajor', 'un', 0, 30, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Alfajor');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Budín Sin TACC (porción)', 'un', 0, 10, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Budín Sin TACC (porción)');

-- 🍳 DESAYUNOS / FRUTAS
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Naranja (unidad)', 'un', 0, 30, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Naranja (unidad)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Yogurt (porción)', 'un', 0, 20, 'Lácteos'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Yogurt (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Banana (unidad)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Banana (unidad)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Frutilla (porción)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Frutilla (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Granola (porción)', 'un', 0, 20, 'Almacén'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Granola (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Huevo Blanco', 'un', 0, 60, 'Avícola'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Huevo Blanco');

-- 🍹 JUGOS Y LICUADOS
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Limón (unidad)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Limón (unidad)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Menta (porción)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Menta (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Jengibre (porción)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Jengibre (porción)');

-- 🥗 ENSALADAS
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Lechuga (porción)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Lechuga (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pechuga/Lomo (porción)', 'un', 0, 20, 'Carnicería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pechuga/Lomo (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Salsa Caesar (medida)', 'un', 0, 20, 'Aderezos'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Salsa Caesar (medida)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Croutons (porción)', 'un', 0, 20, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Croutons (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Tomate Cherry (porción)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Tomate Cherry (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Zanahoria (unidad)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Zanahoria (unidad)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Palta (unidad)', 'un', 0, 10, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Palta (unidad)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Tomate (unidad)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Tomate (unidad)');

-- 🍝 PASTAS Y PIZZAS
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pasta (porción)', 'un', 0, 20, 'Almacén'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pasta (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pasta Rellena (porción)', 'un', 0, 20, 'Almacén'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pasta Rellena (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Masa/Bollo Pizza', 'un', 0, 10, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Masa/Bollo Pizza');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Salsa Tomate (porción)', 'un', 0, 20, 'Almacén'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Salsa Tomate (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Muzzarella (porción)', 'un', 0, 20, 'Lácteos'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Muzzarella (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Jamón Crudo (feta)', 'un', 0, 20, 'Fiambres'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Jamón Crudo (feta)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Rúcula (porción)', 'un', 0, 10, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Rúcula (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Parmesano (porción)', 'un', 0, 10, 'Lácteos'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Parmesano (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Morrón (unidad)', 'un', 0, 10, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Morrón (unidad)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Ajo (diente)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Ajo (diente)');

-- 🥩 MINUTAS
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Milanesa (pieza)', 'un', 0, 20, 'Carnicería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Milanesa (pieza)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Guarnición (porción)', 'un', 0, 30, 'Cocina'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Guarnición (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pan Francés/Baguette', 'un', 0, 20, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pan Francés/Baguette');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pan Burger Brioche', 'un', 0, 20, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pan Burger Brioche');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Mayonesa (individual)', 'un', 0, 50, 'Aderezos'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Mayonesa (individual)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Medallón de Carne', 'un', 0, 20, 'Carnicería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Medallón de Carne');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Panceta (feta)', 'un', 0, 20, 'Fiambres'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Panceta (feta)');

-- 🍽️ PLATOS DIARIOS
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Arroz (porción)', 'un', 0, 20, 'Almacén'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Arroz (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pollo (porción)', 'un', 0, 20, 'Avícola'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pollo (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Cebolla (unidad)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Cebolla (unidad)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Azafrán (sobre)', 'un', 0, 10, 'Almacén'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Azafrán (sobre)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Carne Picada (porción)', 'un', 0, 20, 'Carnicería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Carne Picada (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Papa (porción)', 'un', 0, 20, 'Verdulería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Papa (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Filet Merluza', 'un', 0, 10, 'Pescadería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Filet Merluza');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Pan Rallado (porción)', 'un', 0, 20, 'Almacén'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Pan Rallado (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Bife/Costilla (pieza)', 'un', 0, 10, 'Carnicería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Bife/Costilla (pieza)');

-- 🥟 OTROS
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Tapa Empanada', 'un', 0, 50, 'Panificados'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Tapa Empanada');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Relleno Empanada (porción)', 'un', 0, 20, 'Carnicería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Relleno Empanada (porción)');

-- 🥤 BEBIDAS Y POSTRES
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Agua Ivess 500ml', 'un', 0, 24, 'Bebidas'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Agua Ivess 500ml');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Coca Cola 500ml', 'un', 0, 24, 'Bebidas'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Coca Cola 500ml');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Aquarius 500ml', 'un', 0, 24, 'Bebidas'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Aquarius 500ml');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Flan (porción)', 'un', 0, 10, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Flan (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Budín de Pan (porción)', 'un', 0, 10, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Budín de Pan (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Crema (individual)', 'un', 0, 30, 'Lácteos'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Crema (individual)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Helado (porción)', 'un', 0, 10, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Helado (porción)');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Ensalada de Frutas (porción)', 'un', 0, 10, 'Pastelería'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Ensalada de Frutas (porción)');

-- 📦 DESCARTABLES
INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Papel Individual', 'un', 0, 200, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Papel Individual');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Servilleta', 'un', 0, 500, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Servilleta');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Bolsa Craft', 'un', 0, 100, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Bolsa Craft');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Bolsa Camiseta', 'un', 0, 100, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Bolsa Camiseta');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Folex/Separador', 'un', 0, 100, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Folex/Separador');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Vaso Craft 8oz', 'un', 0, 100, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Vaso Craft 8oz');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Vaso Craft 12oz', 'un', 0, 100, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Vaso Craft 12oz');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Revolvedor', 'un', 0, 200, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Revolvedor');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Bandeja Micro 103', 'un', 0, 50, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Bandeja Micro 103');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Bandeja Micro 105', 'un', 0, 50, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Bandeja Micro 105');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Bandeja Micro 107', 'un', 0, 50, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Bandeja Micro 107');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Caja Cartón Pizza', 'un', 0, 20, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Caja Cartón Pizza');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Bandeja Cartón N5', 'un', 0, 30, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Bandeja Cartón N5');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Bandeja Cartón N3', 'un', 0, 30, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Bandeja Cartón N3');

INSERT INTO public.insumos (nombre, unidad, stock_actual, stock_minimo, categoria)
SELECT 'Ensaladera Cristal', 'un', 0, 10, 'Descartables'
WHERE NOT EXISTS (SELECT 1 FROM public.insumos WHERE nombre = 'Ensaladera Cristal');


-- ──────────────────────────────────────────────
-- 3. RECETAS POR PRODUCTO
-- Cada INSERT busca el producto por nombre (ILIKE) y el insumo
-- por nombre exacto. Si alguno no existe, la fila se omite sin error.
-- ──────────────────────────────────────────────

-- ☕ CAFETERÍA
-- Café Pocillo
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%pocillo%' AND i.nombre = 'Café en Grano (dosis)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%pocillo%' AND i.nombre = 'Azúcar/Edulcorante (sobre)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Café Jarrito
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%jarrito%' AND i.nombre = 'Café en Grano (dosis)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%jarrito%' AND i.nombre = 'Azúcar/Edulcorante (sobre)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Café con Crema (Jarrito)
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%crema%' AND i.nombre = 'Café en Grano (dosis)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%crema%' AND i.nombre = 'Crema (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%crema%' AND i.nombre = 'Azúcar/Edulcorante (sobre)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Café c/ Leche / Lágrima
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%café%leche%' OR p.name ILIKE '%lágrima%') AND i.nombre = 'Café en Grano (dosis)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%café%leche%' OR p.name ILIKE '%lágrima%') AND i.nombre = 'Leche (medida)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%café%leche%' OR p.name ILIKE '%lágrima%') AND i.nombre = 'Azúcar/Edulcorante (sobre)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Café Doble / Cortado Doble
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%café%doble%' OR p.name ILIKE '%cortado%doble%') AND i.nombre = 'Café en Grano (dosis)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%café%doble%' OR p.name ILIKE '%cortado%doble%') AND i.nombre = 'Leche (medida)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%café%doble%' OR p.name ILIKE '%cortado%doble%') AND i.nombre = 'Azúcar/Edulcorante (sobre)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Té / Saborizado / Mate Cocido
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%té%' OR p.name ILIKE '%saborizado%' OR p.name ILIKE '%mate cocido%')
  AND i.nombre = 'Saquito de Té/Mate'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%té%' OR p.name ILIKE '%saborizado%' OR p.name ILIKE '%mate cocido%')
  AND i.nombre = 'Azúcar/Edulcorante (sobre)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Té c/ Leche / Mate c/ Leche
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%té%leche%' OR p.name ILIKE '%mate%leche%') AND i.nombre = 'Leche (medida)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Capuccino
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%capuccino%' AND i.nombre IN ('Café en Grano (dosis)', 'Leche (medida)', 'Cacao (porción)', 'Azúcar/Edulcorante (sobre)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Submarino
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%submarino%' AND i.nombre IN ('Leche (medida)', 'Submarino (barra)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Chocolatada
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%chocolatada%' AND i.nombre IN ('Leche (medida)', 'Cacao (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- ──────────────────────────────────────────────
-- 🥐 PANIFICADOS Y PASTELERÍA
-- ──────────────────────────────────────────────

-- Tostadas (2 un)
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tostadas%' AND i.nombre = 'Pan Lactal/Miga (unidad)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tostadas%' AND i.nombre IN ('Manteca (individual)', 'Mermelada (individual)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- 1/2 Porción Tostadas
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%1/2%tostada%' AND i.nombre IN ('Pan Lactal/Miga (unidad)', 'Manteca (individual)', 'Mermelada (individual)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Factura (unidad)
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%factura%' AND i.nombre = 'Factura'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Medialuna JyQ
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%medialuna%j%q%' AND i.nombre IN ('Feta Jamón', 'Feta Queso')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%medialuna%j%q%' AND i.nombre = 'Medialuna Manteca'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Tostado de Miga
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tostado%miga%' AND i.nombre IN ('Pan Lactal/Miga (unidad)', 'Feta Jamón', 'Feta Queso')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

-- Tostado de Pan Árabe
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tostado%árabe%' AND i.nombre = 'Pan Árabe'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tostado%árabe%' AND i.nombre IN ('Feta Jamón', 'Feta Queso')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

-- Tarta / Lemon Pie / Brownie
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tarta%coco%' AND i.nombre = 'Tarta (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%lemon%pie%' AND i.nombre = 'Lemon Pie (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%brownie%' AND i.nombre = 'Brownie (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Alfajor
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%alfajor%' AND i.nombre = 'Alfajor'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Budín Sin TACC
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%sin tacc%' AND i.nombre = 'Budín Sin TACC (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- ──────────────────────────────────────────────
-- 🍳 DESAYUNOS, MERIENDAS Y PROMOS
-- ──────────────────────────────────────────────

-- Clásico / Saludable (infusión + medialunas o pan + naranja)
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 3 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%clásico%' OR p.name ILIKE '%merienda clásica%') AND i.nombre = 'Medialuna Manteca'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 3;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%clásico%' OR p.name ILIKE '%merienda clásica%') AND i.nombre = 'Naranja (unidad)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%clásico%' OR p.name ILIKE '%merienda clásica%') AND i.nombre IN ('Café en Grano (dosis)', 'Azúcar/Edulcorante (sobre)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Continental
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%continental%' AND i.nombre IN ('Pan Lactal/Miga (unidad)', 'Naranja (unidad)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%continental%' AND i.nombre IN ('Café en Grano (dosis)', 'Leche (medida)', 'Azúcar/Edulcorante (sobre)', 'Huevo Blanco', 'Feta Jamón', 'Feta Queso')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Bloom (Huevo revuelto y palta)
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%bloom%' AND p.name ILIKE '%huevo%' AND i.nombre IN ('Pan Lactal/Miga (unidad)', 'Huevo Blanco')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%bloom%' AND p.name ILIKE '%huevo%' AND i.nombre = 'Palta (unidad)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Yogurt c/ fruta y granola
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%yogurt%' AND i.nombre IN ('Yogurt (porción)', 'Granola (porción)', 'Banana (unidad)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Promo Café c/ Leche + 2 Facturas
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%leche%factura%' AND i.nombre = 'Factura'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%leche%factura%' AND i.nombre IN ('Café en Grano (dosis)', 'Leche (medida)', 'Azúcar/Edulcorante (sobre)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Promo Café c/ Leche + 2 Medialunas JyQ
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%leche%medialuna%' AND i.nombre IN ('Medialuna Manteca', 'Feta Jamón', 'Feta Queso')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%café%leche%medialuna%' AND i.nombre IN ('Café en Grano (dosis)', 'Leche (medida)', 'Azúcar/Edulcorante (sobre)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- ──────────────────────────────────────────────
-- 🍹 JUGOS Y LICUADOS
-- ──────────────────────────────────────────────

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 3 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%exprimido%naranja%' AND i.nombre = 'Naranja (unidad)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 3;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%limonada%' AND i.nombre = 'Limón (unidad)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%limonada%' AND i.nombre IN ('Menta (porción)', 'Jengibre (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%naranjada%' AND i.nombre = 'Naranja (unidad)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%licuado%' AND i.nombre IN ('Banana (unidad)', 'Leche (medida)', 'Azúcar/Edulcorante (sobre)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- ──────────────────────────────────────────────
-- 🥗 ENSALADAS
-- ──────────────────────────────────────────────

-- Caesar
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%caesar%' AND i.nombre IN ('Lechuga (porción)', 'Pechuga/Lomo (porción)', 'Salsa Caesar (medida)', 'Croutons (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Bloom / Liviana
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%ensalada bloom%' OR p.name ILIKE '%ensalada liviana%') AND i.nombre IN ('Lechuga (porción)', 'Tomate Cherry (porción)', 'Zanahoria (unidad)', 'Palta (unidad)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Lechuga y Tomate
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%lechuga%tomate%' AND i.nombre IN ('Lechuga (porción)', 'Tomate (unidad)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Zanahoria y Huevo
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%zanahoria%huevo%' AND i.nombre IN ('Zanahoria (unidad)', 'Huevo Blanco')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- ──────────────────────────────────────────────
-- 🍝 PASTAS Y PIZZAS
-- ──────────────────────────────────────────────

-- Spaghettis
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%spaghetti%' AND i.nombre = 'Pasta (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Ñoquis / Ravioles / Sorrentinos / Canelones
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%ñoqui%' OR p.name ILIKE '%raviol%' OR p.name ILIKE '%sorrentino%' OR p.name ILIKE '%canelon%')
  AND i.nombre = 'Pasta Rellena (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Pizza Muzzarella
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%pizza%muzzarella%' AND i.nombre IN ('Masa/Bollo Pizza', 'Salsa Tomate (porción)', 'Muzzarella (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Pizza Especial / Napolitana
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%pizza%especial%' OR p.name ILIKE '%pizza%napolitana%')
  AND i.nombre IN ('Masa/Bollo Pizza', 'Salsa Tomate (porción)', 'Muzzarella (porción)', 'Morrón (unidad)', 'Tomate (unidad)', 'Ajo (diente)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%pizza%especial%' OR p.name ILIKE '%pizza%napolitana%') AND i.nombre = 'Feta Jamón'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

-- Pizza Rúcula, Crudo y Parmesano
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%pizza%rúcula%' AND i.nombre IN ('Masa/Bollo Pizza', 'Salsa Tomate (porción)', 'Muzzarella (porción)', 'Rúcula (porción)', 'Parmesano (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 2 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%pizza%rúcula%' AND i.nombre = 'Jamón Crudo (feta)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 2;

-- ──────────────────────────────────────────────
-- 🥩 MINUTAS (Con guarnición)
-- ──────────────────────────────────────────────

-- Milanesa / Suprema Sola
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%milanesa%sola%' OR p.name ILIKE '%suprema%sola%') AND i.nombre IN ('Milanesa (pieza)', 'Guarnición (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Milanesa / Suprema JyQ
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%milanesa%j%q%' OR p.name ILIKE '%suprema%j%q%') AND i.nombre IN ('Milanesa (pieza)', 'Feta Jamón', 'Feta Queso', 'Guarnición (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Milanesa Napolitana Especial
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%napolitana%' AND i.nombre IN ('Milanesa (pieza)', 'Salsa Tomate (porción)', 'Feta Jamón', 'Feta Queso', 'Guarnición (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Sándwich de Milanesa Solo
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%sandwich%milanesa%solo%' OR p.name ILIKE '%sándwich%milanesa%solo%') AND i.nombre IN ('Pan Francés/Baguette', 'Milanesa (pieza)', 'Mayonesa (individual)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Sándwich de Milanesa Completo
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%sandwich%milanesa%completo%' OR p.name ILIKE '%sándwich%milanesa%completo%') AND i.nombre IN ('Pan Francés/Baguette', 'Milanesa (pieza)', 'Feta Jamón', 'Feta Queso', 'Tomate (unidad)', 'Lechuga (porción)', 'Huevo Blanco')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Hamburguesa Sola
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%hamburguesa%sola%' OR p.name ILIKE '%burger%sola%') AND i.nombre IN ('Pan Burger Brioche', 'Medallón de Carne')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Hamburguesa JyQ
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%hamburguesa%j%q%' OR p.name ILIKE '%burger%j%q%') AND i.nombre IN ('Pan Burger Brioche', 'Medallón de Carne', 'Feta Jamón', 'Feta Queso')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Hamburguesa Completa
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%hamburguesa%completa%' OR p.name ILIKE '%burger%completa%') AND i.nombre IN ('Pan Burger Brioche', 'Medallón de Carne', 'Feta Jamón', 'Feta Queso', 'Tomate (unidad)', 'Lechuga (porción)', 'Huevo Blanco', 'Panceta (feta)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- ──────────────────────────────────────────────
-- 🍽️ PLATOS DIARIOS
-- ──────────────────────────────────────────────

-- Arroz con Pollo
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%arroz%pollo%' AND i.nombre IN ('Arroz (porción)', 'Pollo (porción)', 'Cebolla (unidad)', 'Morrón (unidad)', 'Azafrán (sobre)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Albóndigas
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%albóndiga%' AND i.nombre IN ('Carne Picada (porción)', 'Salsa Tomate (porción)', 'Guarnición (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Pechuga Grillé / Patamuslo
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%pechuga%grill%' OR p.name ILIKE '%patamuslo%') AND i.nombre IN ('Pechuga/Lomo (porción)', 'Guarnición (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Pastel de Papas
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%pastel%papa%' AND i.nombre IN ('Papa (porción)', 'Carne Picada (porción)', 'Cebolla (unidad)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Filet de Merluza
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%filet%merluza%' AND i.nombre IN ('Filet Merluza', 'Huevo Blanco', 'Pan Rallado (porción)', 'Guarnición (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Bife de Costilla c/ Guarnición
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%bife%guarnición%' OR p.name ILIKE '%costilla%guarnición%') AND i.nombre IN ('Bife/Costilla (pieza)', 'Guarnición (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- ──────────────────────────────────────────────
-- 🥟 OTROS
-- ──────────────────────────────────────────────

-- Tortilla Clásica
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 3 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tortilla%clásica%' AND i.nombre = 'Huevo Blanco'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 3;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tortilla%clásica%' AND i.nombre IN ('Papa (porción)', 'Cebolla (unidad)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Tortilla Bloom (con panceta/chorizo)
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 3 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tortilla bloom%' AND i.nombre = 'Huevo Blanco'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 3;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%tortilla bloom%' AND i.nombre IN ('Papa (porción)', 'Cebolla (unidad)', 'Panceta (feta)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- Empanada
INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%empanada%' AND i.nombre IN ('Tapa Empanada', 'Relleno Empanada (porción)')
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

-- ──────────────────────────────────────────────
-- 🥤 BEBIDAS Y POSTRES
-- ──────────────────────────────────────────────

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%agua%ivess%' OR p.name ILIKE '%ivess%') AND i.nombre = 'Agua Ivess 500ml'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE (p.name ILIKE '%coca%' OR p.name ILIKE '%gaseosa%') AND i.nombre = 'Coca Cola 500ml'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%aquarius%' AND i.nombre = 'Aquarius 500ml'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%flan%' AND i.nombre = 'Flan (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%budín%pan%' AND i.nombre = 'Budín de Pan (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%helado%' AND i.nombre = 'Helado (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

INSERT INTO public.recetas_insumos (menu_product_id, insumo_id, qty)
SELECT p.id, i.id, 1 FROM public.products p, public.insumos i
WHERE p.name ILIKE '%ensalada%fruta%' AND i.nombre = 'Ensalada de Frutas (porción)'
ON CONFLICT (menu_product_id, insumo_id) DO UPDATE SET qty = 1;

COMMIT;
