-- MENÚ CONSOLIDADO: BLOOM COFFEE
-- Este script borra el menú anterior y carga todos los productos en una sola categoría 
-- con nombres cortos y sin imágenes para una cuadrícula limpia.

BEGIN;

-- 1. Limpiar datos anteriores
TRUNCATE public.products CASCADE;
TRUNCATE public.categories CASCADE;

-- 2. Insertar Categoría Única y Productos
DO $$
DECLARE
    cat_id UUID;
BEGIN
    INSERT INTO public.categories (name) VALUES ('MENÚ COMPLETO') RETURNING id INTO cat_id;

    INSERT INTO public.products (name, price, category_id, description, image_url) VALUES 
    -- CAFETERÍA & PANIFICADOS
    ('Café pocillo', 2300, cat_id, NULL, NULL),
    ('Café jarrito', 3000, cat_id, NULL, NULL),
    ('Café doble', 4300, cat_id, NULL, NULL),
    ('Café con leche', 4100, cat_id, NULL, NULL),
    ('Capuccino', 6000, cat_id, NULL, NULL),
    ('Submarino', 6000, cat_id, NULL, NULL),
    ('Té / Mate Cocido', 2800, cat_id, NULL, NULL),
    ('Factura (uni)', 1000, cat_id, NULL, NULL),
    ('Medialuna J&Q', 2000, cat_id, NULL, NULL),
    ('Tostado Miga', 5600, cat_id, NULL, NULL),
    ('1/2 Tostado Miga', 3200, cat_id, NULL, NULL),
    ('Tostado Árabe', 5600, cat_id, NULL, NULL),
    ('Tostadas Huevo/Palta', 7400, cat_id, NULL, NULL),
    
    -- JUGOS & LICUADOS
    ('Exprimido Naranja', 5900, cat_id, NULL, NULL),
    ('Licuado banana/fru', 6500, cat_id, NULL, NULL),
    ('Limonada', 6500, cat_id, NULL, NULL),
    
    -- PASTELERÍA
    ('Tarta Coco', 7500, cat_id, NULL, NULL),
    ('Lemon Pie', 7500, cat_id, NULL, NULL),
    ('Brownie c/ Merengue', 7500, cat_id, NULL, NULL),
    ('Alfajor Maicena', 3500, cat_id, NULL, NULL),
    
    -- PROMOCIONES
    ('Cafe + 2 Facturas', 5500, cat_id, NULL, NULL),
    ('Cafe + 2 Med J&Q', 6900, cat_id, NULL, NULL),
    ('Jarrito + 1 Fact', 3600, cat_id, NULL, NULL),
    
    -- ALMUERZOS / SALADOS
    ('Ensalada Caesar', 7400, cat_id, NULL, NULL),
    ('Ensalada Bloom', 8600, cat_id, NULL, NULL),
    ('Tortilla Clásica', 7900, cat_id, NULL, NULL),
    ('Tortilla Bloom', 8900, cat_id, NULL, NULL),
    ('Burger Sola c/p', 10900, cat_id, NULL, NULL),
    ('Burger J&Q c/p', 11900, cat_id, NULL, NULL),
    ('Burger Comp c/p', 13200, cat_id, NULL, NULL),
    ('Milanesa Sola c/p', 10900, cat_id, NULL, NULL),
    ('Milanesa J&Q c/p', 11900, cat_id, NULL, NULL),
    ('Milanesa Napo esp', 14500, cat_id, NULL, NULL),
    ('Milanesa Comp c/p', 13200, cat_id, NULL, NULL),
    ('Spaghettis', 8900, cat_id, NULL, NULL),
    ('Ñoquis Papa', 9900, cat_id, NULL, NULL),
    ('Sorrentinos J&Q', 9900, cat_id, NULL, NULL),
    ('Pizza Muzzarella', 10900, cat_id, NULL, NULL),
    ('Pizza Especial', 11900, cat_id, NULL, NULL),
    ('Empanada (uni)', 1600, cat_id, NULL, NULL),
    ('Plato Diario (pollo)', 11900, cat_id, NULL, NULL),
    ('Pastel de Papas', 11900, cat_id, NULL, NULL),
    
    -- POSTRES & BEBIDAS
    ('Flan Casero', 3500, cat_id, NULL, NULL),
    ('Budín Pan', 3500, cat_id, NULL, NULL),
    ('Ensalada Frutas', 4000, cat_id, NULL, NULL),
    ('Agua c/s gas', 2500, cat_id, NULL, NULL),
    ('Coca-Cola 500', 3900, cat_id, NULL, NULL),
    ('Cerveza/Vino', 0, cat_id, NULL, NULL);

END $$;

COMMIT;
