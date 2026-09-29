BEGIN;

-- ==========================================
-- 1. LIMPIEZA TOTAL DEL SISTEMA
-- ==========================================
TRUNCATE public.products CASCADE;
TRUNCATE public.categories CASCADE;

-- ==========================================
-- 2. RESTAURACIÓN DE MENÚ DE VENTA (PLATOS)
-- ==========================================
WITH categories_insert AS (
    INSERT INTO public.categories (name) VALUES 
    ('☕ CAFETERIA'),
    ('🥐 DESAYUNOS Y MERIENDAS'),
    ('🥤 JUGOS Y LICUADOS'),
    ('🥖 PANIFICADOS'),
    ('🍰 PASTELERIA'),
    ('🥗 ENSALADAS'),
    ('🍝 PASTAS'),
    ('💧 BEBIDAS SIN ALCOHOL'),
    ('🥩 MILANESAS'),
    ('🍔 HAMBURGUESAS'),
    ('🥟 TARTAS Y EMPANADAS'),
    ('🍕 PIZZAS'),
    ('🍽️ ALMUERZOS Y CENAS'),
    ('🏷️ PROMOCIONES'),
    ('🍟 PAPAS FRITAS'),
    ('🍦 POSTRES'),
    ('🛵 DELIVERY'),
    ('🍾 BEBIDAS CON ALCOHOL'),
    ('🍳 TORTILLAS'),
    ('🥣 SALSAS')
    RETURNING id, name
),
cat_ids AS (
    SELECT 
        (SELECT id FROM categories_insert WHERE name = '☕ CAFETERIA') as cat_cafeteria,
        (SELECT id FROM categories_insert WHERE name = '🥐 DESAYUNOS Y MERIENDAS') as cat_desayunos,
        (SELECT id FROM categories_insert WHERE name = '🥤 JUGOS Y LICUADOS') as cat_jugos,
        (SELECT id FROM categories_insert WHERE name = '🥖 PANIFICADOS') as cat_panificados,
        (SELECT id FROM categories_insert WHERE name = '🍰 PASTELERIA') as cat_pasteleria,
        (SELECT id FROM categories_insert WHERE name = '🥗 ENSALADAS') as cat_ensaladas,
        (SELECT id FROM categories_insert WHERE name = '🍝 PASTAS') as cat_pastas,
        (SELECT id FROM categories_insert WHERE name = '💧 BEBIDAS SIN ALCOHOL') as cat_bebidas_sa,
        (SELECT id FROM categories_insert WHERE name = '🥩 MILANESAS') as cat_milanesas,
        (SELECT id FROM categories_insert WHERE name = '🍔 HAMBURGUESAS') as cat_hamburguesas,
        (SELECT id FROM categories_insert WHERE name = '🥟 TARTAS Y EMPANADAS') as cat_empanadas,
        (SELECT id FROM categories_insert WHERE name = '🍕 PIZZAS') as cat_pizzas,
        (SELECT id FROM categories_insert WHERE name = '🍽️ ALMUERZOS Y CENAS') as cat_almuerzos,
        (SELECT id FROM categories_insert WHERE name = '🏷️ PROMOCIONES') as cat_promociones,
        (SELECT id FROM categories_insert WHERE name = '🍟 PAPAS FRITAS') as cat_papas,
        (SELECT id FROM categories_insert WHERE name = '🍦 POSTRES') as cat_postres,
        (SELECT id FROM categories_insert WHERE name = '🛵 DELIVERY') as cat_delivery,
        (SELECT id FROM categories_insert WHERE name = '🍾 BEBIDAS CON ALCOHOL') as cat_bebidas_ca,
        (SELECT id FROM categories_insert WHERE name = '🍳 TORTILLAS') as cat_tortillas,
        (SELECT id FROM categories_insert WHERE name = '🥣 SALSAS') as cat_salsas
)
INSERT INTO public.products (name, description, price, category_id)
SELECT 
    data.name, 
    data.description, 
    data.price, 
    CASE 
        WHEN data.cat_group = 'cafeteria' THEN cat_ids.cat_cafeteria
        WHEN data.cat_group = 'desayunos' THEN cat_ids.cat_desayunos
        WHEN data.cat_group = 'jugos' THEN cat_ids.cat_jugos
        WHEN data.cat_group = 'panificados' THEN cat_ids.cat_panificados
        WHEN data.cat_group = 'pasteleria' THEN cat_ids.cat_pasteleria
        WHEN data.cat_group = 'ensaladas' THEN cat_ids.cat_ensaladas
        WHEN data.cat_group = 'pastas' THEN cat_ids.cat_pastas
        WHEN data.cat_group = 'bebidas_sa' THEN cat_ids.cat_bebidas_sa
        WHEN data.cat_group = 'milanesas' THEN cat_ids.cat_milanesas
        WHEN data.cat_group = 'hamburguesas' THEN cat_ids.cat_hamburguesas
        WHEN data.cat_group = 'empanadas' THEN cat_ids.cat_empanadas
        WHEN data.cat_group = 'pizzas' THEN cat_ids.cat_pizzas
        WHEN data.cat_group = 'almuerzos' THEN cat_ids.cat_almuerzos
        WHEN data.cat_group = 'promociones' THEN cat_ids.cat_promociones
        WHEN data.cat_group = 'papas' THEN cat_ids.cat_papas
        WHEN data.cat_group = 'postres' THEN cat_ids.cat_postres
        WHEN data.cat_group = 'delivery' THEN cat_ids.cat_delivery
        WHEN data.cat_group = 'bebidas_ca' THEN cat_ids.cat_bebidas_ca
        WHEN data.cat_group = 'tortillas' THEN cat_ids.cat_tortillas
        WHEN data.cat_group = 'salsas' THEN cat_ids.cat_salsas
        ELSE cat_ids.cat_almuerzos
    END
FROM (
    VALUES 
    -- CAFETERÍA
    ('Café pocillo (espresso / cortado / ristretto)', '', 2300, 'cafeteria'),
    ('Café / cortado / lágrima (en jarrito)', '', 3000, 'cafeteria'),
    ('Café con crema (en jarrito)', '', 4100, 'cafeteria'),
    ('Café c/ leche - lágrima doble', '', 4100, 'cafeteria'),
    ('Café doble / cortado doble', '', 4300, 'cafeteria'),
    ('Té / té saborizado / mate cocido', '', 2800, 'cafeteria'),
    ('Té c/ leche / mate cocido c/ leche', '', 3200, 'cafeteria'),
    ('Capuccino', '', 6000, 'cafeteria'),
    ('Submarino', '', 6000, 'cafeteria'),
    ('Chocolatada', '', 4500, 'cafeteria'),

    -- DESAYUNOS
    ('Des. Clásico', 'Infusión + 3 medialunas + 1/2 exprimido', 10500, 'desayunos'),
    ('Des. Saludable', 'Infusión + 2 tostadas pan campo c/ queso + 1/2 exprimido', 10500, 'desayunos'),
    ('Des. Continental', 'Infusión + 2 medialunas + 1/2 tostado + 1/2 exprimido', 11900, 'desayunos'),
    ('Des. Bloom', 'Infusión + tostadas c/ huevo revuelto y palta + 1/2 exprimido', 14900, 'desayunos'),
    ('Yogurt c/ fruta y granola', '', 4900, 'desayunos'),
    ('Promo Café c/ leche + 2 facturas', '', 5500, 'desayunos'),
    ('Promo Café c/ leche + 2 med J&Q', '', 6900, 'desayunos'),
    ('Promo Jarrito + 1 factura', '', 3600, 'desayunos'),
    ('Promo Jarrito + 2 facturas', '', 4000, 'desayunos'),

    -- PASTELERIA
    ('Facturas (unidad)', '', 1000, 'pasteleria'),
    ('Tarta de coco', '', 7500, 'pasteleria'),
    ('Lemon pie', '', 7500, 'pasteleria'),
    ('Brownie c/ merengue', '', 7500, 'pasteleria'),
    ('Budín de limón y amapolas', '', 3900, 'pasteleria'),
    ('Alfajores de seguido', '', 3500, 'pasteleria'),
    ('Alfajores de maicena', '', 3500, 'pasteleria'),
    ('Cookies / barritas', '', 2500, 'pasteleria'),
    ('Cookie Tres Chocolates', '', 4900, 'pasteleria'),
    ('Cookie Naranja y Chocolate', '', 4900, 'pasteleria'),
    ('Cookie Oreo', '', 4900, 'pasteleria'),
    ('Cookie Pistacho y Choco Blanco', '', 4900, 'pasteleria'),
    ('Cookie Frutos Rojos, Limón y Choco Blanco', '', 4900, 'pasteleria'),
    ('Porciones sin TACC', '', 3900, 'pasteleria'),

    -- PANIFICADOS
    ('Porción de tostadas (2 uni)', '', 3900, 'panificados'),
    ('1/2 porp. tostadas (1 uni)', '', 2100, 'panificados'),
    ('Tostado de miga (Entero)', '', 5600, 'panificados'),
    ('1/2 Tostado de miga', '', 3200, 'panificados'),
    ('Tostado de pan árabe', '', 5600, 'panificados'),
    ('Medialuna c/ J&Q', '', 2000, 'panificados'),
    ('Tostadas c/ huevo revuelto y palta (2 uni)', '', 7400, 'panificados'),

    -- JUGOS Y LICUADOS
    ('Exprimido de naranja', '', 5900, 'jugos'),
    ('Medio exprimido', '', 3900, 'jugos'),
    ('Naranjada', '', 6500, 'jugos'),
    ('Limonada', '', 6500, 'jugos'),
    ('Licuado (banana / frutilla)', '', 6500, 'jugos'),

    -- BEBIDAS SIN ALCOHOL
    ('Agua con o sin gas Ivess', '', 2500, 'bebidas_sa'),
    ('Gaseosa línea Coca x 500 ml', '', 3900, 'bebidas_sa'),
    ('Agua saborizada Aquarius x 500 ml', '', 3900, 'bebidas_sa'),

    -- BEBIDAS CON ALCOHOL
    ('Cervezas (consultar)', '', 0, 'bebidas_ca'),
    ('Vinos (consultar)', '', 0, 'bebidas_ca'),

    -- ENSALADAS
    ('Ensalada Caesar', 'lechuga / pollo / croutons / salsa caesar', 7400, 'ensaladas'),
    ('Ensalada Bloom', 'lechuga / tomate / zanahoria / huevo / palta / choclo', 8600, 'ensaladas'),
    ('Ensalada Liviana', 'rúcula / parmesano / cherry / champignones / queso', 8600, 'ensaladas'),
    ('Ensalada Criolla', 'lechuga / tomate / cebolla', 6200, 'ensaladas'),
    ('Ensalada Lechuga y tomate', '', 6000, 'ensaladas'),
    ('Ensalada Zanahoria y huevo', '', 6000, 'ensaladas'),
    ('Ensalada Rúcula y parmesano', '', 6500, 'ensaladas'),
    ('Ensalada Zanahoria, huevo / choclo y lentejas', '', 7400, 'ensaladas'),

    -- TORTILLAS
    ('Tortilla Clásica', 'papa, huevo, cebolla y morrón', 7900, 'tortillas'),
    ('Tortilla Bloom', 'papa, huevo, cebolla, morrón, jamón y queso', 8900, 'tortillas'),

    -- HAMBURGUESAS
    ('Burger Sola', 'con papas fritas', 10900, 'hamburguesas'),
    ('Burger con jamón y queso', 'con papas fritas', 11900, 'hamburguesas'),
    ('Burger Completa', 'con papas fritas', 13200, 'hamburguesas'),

    -- PASTAS
    ('Spaghettis', 'Salsa: boloñesa, filetto, blanca o mixta', 8900, 'pastas'),
    ('Ñoquis de papa', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'pastas'),
    ('Ravioles de calabaza y ricota', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'pastas'),
    ('Sorrentinos de jamón y queso', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'pastas'),
    ('Ravioles de verdura', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'pastas'),
    ('Canelones de verdura y ricota', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'pastas'),

    -- MILANESAS
    ('Milanesa Sola', 'con papas fritas', 10900, 'milanesas'),
    ('Milanesa con jamón y queso', 'con papas fritas', 11900, 'milanesas'),
    ('Milanesa Napolitana especial', 'con papas fritas', 14500, 'milanesas'),
    ('Milanesa Completa', 'con papas fritas', 13200, 'milanesas'),
    ('Sándwich milanesa solo', '', 8900, 'milanesas'),
    ('Sándwich completo milanesa c/ fritas', 'lechuga, tomate, jamón y queso', 10900, 'milanesas'),

    -- PIZZAS
    ('Pizza Muzzarella', '', 10900, 'pizzas'),
    ('Pizza Especial', '', 11900, 'pizzas'),
    ('Pizza Napolitana', '', 11900, 'pizzas'),
    ('Pizza Rúcula, crudo y parmesano', '', 13900, 'pizzas'),

    -- TARTAS Y EMPANADAS
    ('Empanada (Unidad)', 'Carne / pollo / J&Q / choclo', 1600, 'empanadas'),
    ('1/2 Docena Empanadas', '', 8900, 'empanadas'),
    ('1 Docena Empanadas', '', 17000, 'empanadas'),
    ('Tarta Jamón y Queso', '', 6900, 'empanadas'),
    ('Tarta Verdura', '', 6900, 'empanadas'),
    ('Tarta Caprese', '', 6500, 'empanadas'),

    -- ALMUERZOS Y CENAS
    ('Plato: Arroz con pollo', '', 11900, 'almuerzos'),
    ('Plato: Albóndigas con puré', '', 11900, 'almuerzos'),
    ('Plato: Pechuga grille c/ guarnición', 'papas fritas / ensalada o puré', 11900, 'almuerzos'),
    ('Plato: Patamuslo c/ guarnición', 'papas fritas / ensalada o puré', 11900, 'almuerzos'),
    ('Plato: Bife de costilla c/ guarnición', 'papas fritas / ensalada o puré', 13900, 'almuerzos'),
    ('Plato: Pastel de papas', '', 11900, 'almuerzos'),
    ('Plato: Filet de merluza empanado o romana', '', 12900, 'almuerzos'),
    ('Plato: Lentejas a la española', '', 13900, 'almuerzos'),
    ('Wrap Primavera', 'Jamón, queso, lechuga, tomate y huevo', 6900, 'almuerzos'),
    ('Wrap Rúcula', 'Rúcula, queso parmesano, zanahoria y cherry', 6900, 'almuerzos'),
    ('Wrap Caesar', 'Lechuga, pollo, queso parmesano y salsa Caesar', 6900, 'almuerzos'),
    ('Wrap Carne', 'Carne tiernizada, cebolla caramelizada y queso cheddar', 8500, 'almuerzos'),
    ('Wrap Pollo', 'Pollo, lechuga y tomate', 8500, 'almuerzos'),

    -- PAPAS FRITAS
    ('Papas Fritas Clásicas', '', 5500, 'papas'),

    -- POSTRES
    ('Flan casero', '', 3500, 'postres'),
    ('Budín de pan', '', 3500, 'postres'),
    ('Helado', '', 4000, 'postres'),
    ('Ensalada de frutas', '', 4000, 'postres'),

    -- SALSAS
    ('Adicional Salsa', '', 500, 'salsas'),
    ('Adicional Huevo', '', 1000, 'salsas')

) AS data(name, description, price, cat_group),
cat_ids;

-- ==========================================
-- 3. RESTAURACIÓN DE INVENTARIO (INSUMOS)
-- ==========================================

-- Ajuste de Restricciones
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_unit_check;
ALTER TABLE public.products ADD CONSTRAINT products_unit_check CHECK (unit IN ('kg', 'g', 'l', 'ml', 'u', 'un', 'unit'));

-- Carga de Insumos (No hace falta borrar raw porque TRUNCATE products arriba borró todo)

-- CARNICERÍA (KG)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Lomo Limpio', 'raw', 'kg', true, 5.0, 0, 0),
('Bife de Chorizo', 'raw', 'kg', true, 10.0, 0, 0),
('Ojo de Bife', 'raw', 'kg', true, 5.0, 0, 0),
('Carne Picada Especial', 'raw', 'kg', true, 15.0, 0, 0),
('Tapa de Asado', 'raw', 'kg', true, 5.0, 0, 0),
('Bondiola de Cerdo', 'raw', 'kg', true, 8.0, 0, 0),
('Matambre Vacuno', 'raw', 'kg', true, 4.0, 0, 0),
('Pollo Entero', 'raw', 'kg', true, 20.0, 0, 0),
('Pechuga de Pollo', 'raw', 'kg', true, 15.0, 0, 0),
('Salmón Rosado', 'raw', 'kg', true, 2.0, 0, 0),
('Langostinos', 'raw', 'kg', true, 2.0, 0, 0);

-- VERDULERÍA (KG)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Papa Negra', 'raw', 'kg', true, 100.0, 0, 0),
('Cebolla Común', 'raw', 'kg', true, 40.0, 0, 0),
('Cebolla Morada', 'raw', 'kg', true, 10.0, 0, 0),
('Zanahoria', 'raw', 'kg', true, 15.0, 0, 0),
('Tomate Redondo', 'raw', 'kg', true, 20.0, 0, 0),
('Tomate Perita', 'raw', 'kg', true, 10.0, 0, 0),
('Tomate Cherry', 'raw', 'kg', true, 3.0, 0, 0),
('Lechuga Capuchina', 'raw', 'kg', true, 10.0, 0, 0),
('Lechuga Mantecosa', 'raw', 'kg', true, 5.0, 0, 0),
('Rúcula', 'raw', 'kg', true, 3.0, 0, 0),
('Espinaca', 'raw', 'kg', true, 4.0, 0, 0),
('Morrón Rojo', 'raw', 'kg', true, 5.0, 0, 0),
('Morrón Verde', 'raw', 'kg', true, 3.0, 0, 0),
('Palta Hass', 'raw', 'kg', true, 4.0, 0, 0),
('Limón', 'raw', 'kg', true, 10.0, 0, 0),
('Ajo', 'raw', 'kg', true, 1.0, 0, 0),
('Perejil', 'raw', 'kg', true, 1.0, 0, 0),
('Albahaca', 'raw', 'kg', true, 0.5, 0, 0),
('Batata', 'raw', 'kg', true, 10.0, 0, 0),
('Zapallo Anco', 'raw', 'kg', true, 10.0, 0, 0),
('Champiñones', 'raw', 'kg', true, 2.0, 0, 0);

-- ALMACÉN Y SECOS (KG / L)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Harina 0000', 'raw', 'kg', true, 50.0, 0, 0),
('Harina Leudante', 'raw', 'kg', true, 10.0, 0, 0),
('Arroz Carnaroli', 'raw', 'kg', true, 10.0, 0, 0),
('Arroz Largo Fino', 'raw', 'kg', true, 20.0, 0, 0),
('Fideos Spaghetti', 'raw', 'kg', true, 10.0, 0, 0),
('Fideos Penne Rigate', 'raw', 'kg', true, 10.0, 0, 0),
('Azúcar Blanca', 'raw', 'kg', true, 20.0, 0, 0),
('Azúcar Mascabo', 'raw', 'kg', true, 5.0, 0, 0),
('Sal Fina', 'raw', 'kg', true, 10.0, 0, 0),
('Sal Entrefina', 'raw', 'kg', true, 5.0, 0, 0),
('Aceite Girasol', 'raw', 'l', true, 40.0, 0, 0),
('Aceite Oliva Extra Virgen', 'raw', 'l', true, 10.0, 0, 0),
('Vinagre de Alcohol', 'raw', 'l', true, 5.0, 0, 0),
('Aceto Balsámico', 'raw', 'l', true, 3.0, 0, 0),
('Pan Rallado', 'raw', 'kg', true, 15.0, 0, 0),
('Café en Grano Importado', 'raw', 'kg', true, 10.0, 0, 0),
('Chocolate Semiamargo', 'raw', 'kg', true, 5.0, 0, 0),
('Dulce de Leche Repostero', 'raw', 'kg', true, 10.0, 0, 0);

-- LÁCTEOS Y FIAMBRES (KG / L / U)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Leche Entera', 'raw', 'l', true, 60.0, 0, 0),
('Leche Descremada', 'raw', 'l', true, 12.0, 0, 0),
('Crema de Leche', 'raw', 'l', true, 10.0, 0, 0),
('Manteca', 'raw', 'kg', true, 10.0, 0, 0),
('Queso Muzzarella Cilindro', 'raw', 'kg', true, 30.0, 0, 0),
('Queso Tybo', 'raw', 'kg', true, 15.0, 0, 0),
('Queso Parmesano', 'raw', 'kg', true, 5.0, 0, 0),
('Queso Azul', 'raw', 'kg', true, 2.0, 0, 0),
('Queso Cheddar Feteado', 'raw', 'kg', true, 5.0, 0, 0),
('Queso Crema', 'raw', 'kg', true, 10.0, 0, 0),
('Jamón Cocido Natural', 'raw', 'kg', true, 15.0, 0, 0),
('Jamón Crudo', 'raw', 'kg', true, 3.0, 0, 0),
('Panceta Ahumada', 'raw', 'kg', true, 5.0, 0, 0),
('Salame Milán', 'raw', 'kg', true, 2.0, 0, 0),
('Huevo Blanco Grade A', 'raw', 'u', true, 180.0, 0, 0);

-- PANIFICADOS (U)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Pan Burger Brioche', 'raw', 'u', true, 100.0, 0, 0),
('Pan Lomo/Baguette', 'raw', 'u', true, 50.0, 0, 0),
('Pan Miga Blanco', 'raw', 'u', true, 20.0, 0, 0),
('Pan Miga Negro', 'raw', 'u', true, 10.0, 0, 0),
('Medialuna de Manteca', 'raw', 'u', true, 100.0, 0, 0),
('Medialuna de Grasa', 'raw', 'u', true, 50.0, 0, 0),
('Pan de Campo (Hogaza)', 'raw', 'u', true, 10.0, 0, 0),
('Baguetin', 'raw', 'u', true, 50.0, 0, 0);

-- ADEREZOS INDUSTRIALES (KG / L)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Mayonesa', 'raw', 'kg', true, 5.0, 0, 0),
('Mostaza', 'raw', 'kg', true, 3.0, 0, 0),
('Ketchup', 'raw', 'kg', true, 3.0, 0, 0),
('Salsa Soja', 'raw', 'l', true, 2.0, 0, 0);


COMMIT;
