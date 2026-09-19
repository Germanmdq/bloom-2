-- MENÚ COMPLETO BLOOM: 5 CATEGORÍAS
-- Este script borra el menú anterior y carga todos los productos organizados en 5 categorías.

BEGIN;

-- 1. Limpiar datos anteriores
TRUNCATE public.products CASCADE;
TRUNCATE public.categories CASCADE;

-- 2. Insertar Categorías y Productos
DO $$
DECLARE
    cat_cafe UUID;
    cat_panificados UUID;
    cat_promos UUID;
    cat_resto UUID;
    cat_bebidas_postres UUID;
BEGIN
    -- Crear las 5 categorías
    INSERT INTO public.categories (name) VALUES ('CAFETERÍA Y JUGOS') RETURNING id INTO cat_cafe;
    INSERT INTO public.categories (name) VALUES ('PANIFICADOS Y PASTELERÍA') RETURNING id INTO cat_panificados;
    INSERT INTO public.categories (name) VALUES ('PROMOS Y MERIENDAS') RETURNING id INTO cat_promos;
    INSERT INTO public.categories (name) VALUES ('BLOOM RESTO (COMIDAS)') RETURNING id INTO cat_resto;
    INSERT INTO public.categories (name) VALUES ('BEBIDAS Y POSTRES') RETURNING id INTO cat_bebidas_postres;

    -- 1. CAFETERÍA Y JUGOS
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Café pocillo', 2300, cat_cafe),
    ('Café jarrito', 3000, cat_cafe),
    ('Café con crema', 4100, cat_cafe),
    ('Café c/ leche (doble)', 4100, cat_cafe),
    ('Café doble / Cortado doble', 4300, cat_cafe),
    ('Té / Mate cocido', 2800, cat_cafe),
    ('Té / Mate cocido c/ leche', 3200, cat_cafe),
    ('Capuccino', 6000, cat_cafe),
    ('Submarino', 6000, cat_cafe),
    ('Chocolatada', 4500, cat_cafe),
    ('Exprimido de naranja', 5900, cat_cafe),
    ('Medio exprimido', 3900, cat_cafe),
    ('Naranjada', 6500, cat_cafe),
    ('Limonada', 6500, cat_cafe),
    ('Licuado (Banana/Frutilla)', 6500, cat_cafe);

    -- 2. PANIFICADOS Y PASTELERÍA
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Porción tostadas (2 uni)', 3900, cat_panificados),
    ('1/2 Porción tostadas (1 uni)', 2100, cat_panificados),
    ('Facturas (unidad)', 1000, cat_panificados),
    ('Medialunas J&Q', 2000, cat_panificados),
    ('Tostado de miga', 5600, cat_panificados),
    ('1/2 Tostado de miga', 3200, cat_panificados),
    ('Tostado pan árabe', 5600, cat_panificados),
    ('Tostadas Huevo y Palta', 7400, cat_panificados),
    ('Tarta de coco', 7500, cat_panificados),
    ('Lemon pie', 7500, cat_panificados),
    ('Brownie c/ merengue', 7500, cat_panificados),
    ('Budín Limón y Amapolas', 3900, cat_panificados),
    ('Alfajores de seguido', 3500, cat_panificados),
    ('Alfajores de maicena', 3500, cat_panificados),
    ('Porciones sin TACC', 3900, cat_panificados),
    ('Cookies / Barritas', 2500, cat_panificados);

    -- 3. PROMOS Y MERIENDAS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Merienda Clásica', 'Infusión + 3 medialunas + 1/2 exprimido', 10500, cat_promos),
    ('Merienda Saludable', 'Infusión + 2 tostadas de pan de campo c/ queso + 1/2 exprimido', 10500, cat_promos),
    ('Merienda Continental', 'Infusión + 2 medialunas + 1/2 tostado + 1/2 exprimido', 11900, cat_promos),
    ('Merienda Bloom', 'Infusión + tostadas c/ huevo revuelto y palta + 1/2 exprimido', 14900, cat_promos),
    ('Yogurt c/ fruta y granola', NULL, 4900, cat_promos),
    ('Café c/ leche + 2 facturas', NULL, 5500, cat_promos),
    ('Café c/ leche + 2 med J&Q', NULL, 6900, cat_promos),
    ('Jarrito + 1 factura', NULL, 3600, cat_promos),
    ('Jarrito + 2 facturas', NULL, 4000, cat_promos);

    -- 4. BLOOM RESTO (COMIDAS)
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Ensalada Caesar', 'lechuga / pollo / croutons / salsa caesar', 7400, cat_resto),
    ('Ensalada Bloom', 'lechuga / tomate / zanahoria / huevo / palta / choclo', 8600, cat_resto),
    ('Ensalada Liviana', 'rúcula / parmesano / cherry / champignones / queso', 8600, cat_resto),
    ('Ensalada Criolla', 'lechuga / tomate / cebolla', 6200, cat_resto),
    ('Ensalada Lechuga y tomate', NULL, 6000, cat_resto),
    ('Ensalada Zanahoria y huevo', NULL, 6000, cat_resto),
    ('Ensalada Rúcula y parmesano', NULL, 6500, cat_resto),
    ('Ensalada Zanahoria, huevo, choclo y lens', NULL, 7400, cat_resto),
    ('Tortilla Clásica', 'papa, huevo, cebolla y morrón', 7900, cat_resto),
    ('Tortilla Bloom', 'papa, huevo, cebolla, morrón, jamón y queso', 8900, cat_resto),
    ('Burger Sola', 'con papas fritas', 10900, cat_resto),
    ('Burger Jamón y Queso', 'con papas fritas', 11900, cat_resto),
    ('Burger Completa', 'con papas fritas', 13200, cat_resto),
    ('Spaghettis', 'Salsa: boloñesa, filetto, blanca o mixta', 8900, cat_resto),
    ('Ñoquis de papa', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, cat_resto),
    ('Ravioles calabaza y ricota', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, cat_resto),
    ('Sorrentinos J&Q', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, cat_resto),
    ('Ravioles de verdura', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, cat_resto),
    ('Canelones verdura y ricota', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, cat_resto),
    ('Milanesa Sola', 'con papas fritas', 10900, cat_resto),
    ('Milanesa J&Q', 'con papas fritas', 11900, cat_resto),
    ('Milanesa Napolitana esp', 'con papas fritas', 14500, cat_resto),
    ('Milanesa Completa', 'con papas fritas', 13200, cat_resto),
    ('Sándwich de milanesa', NULL, 8900, cat_resto),
    ('Sándwich milanesa completo', 'lechuga, tomate, jamón y queso + fritas', 10900, cat_resto),
    ('Pizza Muzzarella', NULL, 10900, cat_resto),
    ('Pizza Especial', NULL, 11900, cat_resto),
    ('Pizza Napolitana', NULL, 11900, cat_resto),
    ('Pizza Rúcula, crudo y parm', NULL, 13900, cat_resto),
    ('Empanada (unidad)', 'Carne / pollo / J&Q / choclo', 1600, cat_resto),
    ('1/2 docena Empanadas', NULL, 8900, cat_resto),
    ('1 docena Empanadas', NULL, 17000, cat_resto),
    ('Arroz con pollo', NULL, 11900, cat_resto),
    ('Albóndigas con puré', NULL, 11900, cat_resto),
    ('Pechuga grille c/ guarnición', 'papas fritas / ensalada o puré', 11900, cat_resto),
    ('Patamuslo c/ guarnición', 'papas fritas / ensalada o puré', 11900, cat_resto),
    ('Bife de costilla c/ guarnición', 'papas fritas / ensalada o puré', 13900, cat_resto),
    ('Pastel de papas', NULL, 11900, cat_resto),
    ('Filet de merluza empanado', NULL, 12900, cat_resto),
    ('Lentejas a la española', NULL, 13900, cat_resto);

    -- 5. BEBIDAS Y POSTRES
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Flan casero', 3500, cat_bebidas_postres),
    ('Budín de pan', 3500, cat_bebidas_postres),
    ('Helado', 4000, cat_bebidas_postres),
    ('Ensalada de frutas', 4000, cat_bebidas_postres),
    ('Agua c/s gas Ivess', 2500, cat_bebidas_postres),
    ('Gaseosa Coca 500ml', 3900, cat_bebidas_postres),
    ('Agua saborizada 500ml', 3900, cat_bebidas_postres),
    ('Cervezas', 0, cat_bebidas_postres),
    ('Vinos', 0, cat_bebidas_postres);

END $$;

COMMIT;
