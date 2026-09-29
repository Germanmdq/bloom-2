-- MIGración COMPLETA DE MENÚ: BLOOM COFFEE & MORE
-- Este script borra el menú anterior y carga el nuevo menú real.

BEGIN;

-- 1. Limpiar datos anteriores
TRUNCATE public.products CASCADE;
TRUNCATE public.categories CASCADE;

-- 2. Insertar Categorías y guardar IDs en variables
DO $$
DECLARE
    cat_cafe UUID;
    cat_jugos UUID;
    cat_panificados UUID;
    cat_pasteleria UUID;
    cat_meriendas UUID;
    cat_promos UUID;
    cat_ensaladas UUID;
    cat_tortillas UUID;
    cat_burgers UUID;
    cat_pastas UUID;
    cat_milanesas UUID;
    cat_sandwiches UUID;
    cat_pizzas UUID;
    cat_empanadas UUID;
    cat_diarios UUID;
    cat_postres UUID;
    cat_bebidas UUID;
BEGIN
    -- Crear Categorías
    INSERT INTO public.categories (name) VALUES ('CAFETERÍA') RETURNING id INTO cat_cafe;
    INSERT INTO public.categories (name) VALUES ('JUGOS Y LICUADOS') RETURNING id INTO cat_jugos;
    INSERT INTO public.categories (name) VALUES ('PANIFICADOS') RETURNING id INTO cat_panificados;
    INSERT INTO public.categories (name) VALUES ('PASTELERÍA') RETURNING id INTO cat_pasteleria;
    INSERT INTO public.categories (name) VALUES ('DESAYUNOS Y MERIENDAS') RETURNING id INTO cat_meriendas;
    INSERT INTO public.categories (name) VALUES ('PROMOCIONES') RETURNING id INTO cat_promos;
    INSERT INTO public.categories (name) VALUES ('ENSALADAS') RETURNING id INTO cat_ensaladas;
    INSERT INTO public.categories (name) VALUES ('TORTILLAS') RETURNING id INTO cat_tortillas;
    INSERT INTO public.categories (name) VALUES ('HAMBURGUESAS') RETURNING id INTO cat_burgers;
    INSERT INTO public.categories (name) VALUES ('PASTAS') RETURNING id INTO cat_pastas;
    INSERT INTO public.categories (name) VALUES ('MILANESAS') RETURNING id INTO cat_milanesas;
    INSERT INTO public.categories (name) VALUES ('SÁNDWICHES') RETURNING id INTO cat_sandwiches;
    INSERT INTO public.categories (name) VALUES ('PIZZAS') RETURNING id INTO cat_pizzas;
    INSERT INTO public.categories (name) VALUES ('EMPANADAS') RETURNING id INTO cat_empanadas;
    INSERT INTO public.categories (name) VALUES ('PLATOS DIARIOS') RETURNING id INTO cat_diarios;
    INSERT INTO public.categories (name) VALUES ('POSTRES') RETURNING id INTO cat_postres;
    INSERT INTO public.categories (name) VALUES ('BEBIDAS') RETURNING id INTO cat_bebidas;

    -- CAFETERÍA
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Café pocillo (espresso / cortado / ristretto)', 2300, cat_cafe),
    ('Café / cortado / lágrima (en jarrito)', 3000, cat_cafe),
    ('Café con crema (en jarrito)', 4100, cat_cafe),
    ('Café c/ leche - lágrima doble', 4100, cat_cafe),
    ('Café doble / cortado doble', 4300, cat_cafe),
    ('Té / té saborizado / mate cocido', 2800, cat_cafe),
    ('Té c/ leche / mate cocido c/ leche', 3200, cat_cafe),
    ('Capuccino', 6000, cat_cafe),
    ('Submarino', 6000, cat_cafe),
    ('Chocolatada', 4500, cat_cafe);

    -- JUGOS Y LICUADOS
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Exprimido de naranja', 5900, cat_jugos),
    ('Medio exprimido', 3900, cat_jugos),
    ('Naranjada', 6500, cat_jugos),
    ('Limonada', 6500, cat_jugos),
    ('Licuado (banana / frutilla)', 6500, cat_jugos);

    -- PANIFICADOS
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Porción de tostadas (2 uni)', 3900, cat_panificados),
    ('1/2 porción tostadas (1 uni)', 2100, cat_panificados),
    ('Facturas (unidad)', 1000, cat_panificados),
    ('Medialunas c/ jamón y queso', 2000, cat_panificados),
    ('Tostado de miga', 5600, cat_panificados),
    ('1/2 tostado de miga', 3200, cat_panificados),
    ('Tostado de pan árabe', 5600, cat_panificados),
    ('Tostadas con huevo revuelto y palta (2 uni)', 7400, cat_panificados);

    -- PASTELERÍA
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Tarta de coco', 7500, cat_pasteleria),
    ('Lemon pie', 7500, cat_pasteleria),
    ('Brownie c/ merengue', 7500, cat_pasteleria),
    ('Budín de limón y amapolas', 3900, cat_pasteleria),
    ('Alfajores de seguido', 3500, cat_pasteleria),
    ('Alfajores de maicena', 3500, cat_pasteleria),
    ('Porciones sin TACC', 3900, cat_pasteleria),
    ('Cookies / barritas', 2500, cat_pasteleria);

    -- DESAYUNOS Y MERIENDAS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Clásico', 'Infusión + 3 medialunas + 1/2 exprimido', 10500, cat_meriendas),
    ('Saludable', 'Infusión + 2 tostadas de pan de campo c/ queso + 1/2 exprimido', 10500, cat_meriendas),
    ('Continental', 'Infusión + 2 medialunas + 1/2 tostado + 1/2 exprimido', 11900, cat_meriendas),
    ('Bloom', 'Infusión + tostadas c/ huevo revuelto y palta (2 uni) + 1/2 exprimido', 14900, cat_meriendas),
    ('Yogurt', 'c/ fruta y granola', 4900, cat_meriendas);

    -- PROMOCIONES
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Café c/ leche + 2 facturas', 5500, cat_promos),
    ('Café c/ leche + 2 medialunas con jamón y queso', 6900, cat_promos),
    ('Jarrito + 1 factura', 3600, cat_promos),
    ('Jarrito + 2 facturas', 4000, cat_promos);

    -- ENSALADAS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Caesar', 'lechuga / pollo / croutons / salsa caesar', 7400, cat_ensaladas),
    ('Bloom salad', 'lechuga / tomate / zanahoria / huevo / palta / choclo', 8600, cat_ensaladas),
    ('Liviana', 'rúcula / parmesano / cherry / champignones / queso', 8600, cat_ensaladas),
    ('Criolla', 'lechuga / tomate / cebolla', 6200, cat_ensaladas),
    ('Lechuga y tomate', '', 6000, cat_ensaladas),
    ('Zanahoria y huevo', '', 6000, cat_ensaladas),
    ('Rúcula y parmesano', '', 6500, cat_ensaladas),
    ('Zanahoria, huevo / choclo y lentejas', '', 7400, cat_ensaladas);

    -- TORTILLAS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Tortilla Clásica', 'papa, huevo, cebolla y morrón', 7900, cat_tortillas),
    ('Tortilla Bloom', 'papa, huevo, cebolla, morrón, jamón y queso', 8900, cat_tortillas);

    -- HAMBURGUESAS (con papas fijas)
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Burger Sola', 'Con papas fritas', 10900, cat_burgers),
    ('Burger Jamón y Queso', 'Con papas fritas', 11900, cat_burgers),
    ('Burger Completa', 'Con papas fritas', 13200, cat_burgers);

    -- PASTAS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Spaghettis', 'Salsa a elección: boloñesa, filetto, blanca o mixta', 8900, cat_pastas),
    ('Ñoquis de papa', 'Salsa a elección: boloñesa, filetto, blanca o mixta', 9900, cat_pastas),
    ('Ravioles de calabaza y ricota', 'Salsa a elección: boloñesa, filetto, blanca o mixta', 9900, cat_pastas),
    ('Sorrentinos de jamón y queso', 'Salsa a elección: boloñesa, filetto, blanca o mixta', 9900, cat_pastas),
    ('Ravioles de verdura', 'Salsa a elección: boloñesa, filetto, blanca o mixta', 9900, cat_pastas),
    ('Canelones de verdura y ricota', 'Salsa a elección: boloñesa, filetto, blanca o mixta', 9900, cat_pastas);

    -- MILANESAS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Milanesa Sola', 'Con papas fritas', 10900, cat_milanesas),
    ('Milanesa Jamón y Queso', 'Con papas fritas', 11900, cat_milanesas),
    ('Milanesa Napolitana especial', 'Con papas fritas', 14500, cat_milanesas),
    ('Milanesa Completa', 'Con papas fritas', 13200, cat_milanesas);

    -- SÁNDWICHES
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Sándwich milanesa', '', 8900, cat_sandwiches),
    ('Sándwich comp. de milanesa c/ fritas', 'lechuga, tomate, jamón y queso', 10900, cat_sandwiches);

    -- PIZZAS
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Pizza Muzzarella', 10900, cat_pizzas),
    ('Pizza Especial', 11900, cat_pizzas),
    ('Pizza Napolitana', 11900, cat_pizzas),
    ('Pizza Rúcula, crudo y parmesano', 13900, cat_pizzas);

    -- EMPANADAS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Empanada (unidad)', 'Carne / pollo / jamón y queso / choclo', 1600, cat_empanadas),
    ('1/2 docena Empanadas', '', 8900, cat_empanadas),
    ('1 docena Empanadas', '', 17000, cat_empanadas);

    -- PLATOS DIARIOS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Arroz con pollo', '', 11900, cat_diarios),
    ('Albóndigas con puré', '', 11900, cat_diarios),
    ('Pechuga grille c/ guarnición', 'papas fritas / ensalada o puré', 11900, cat_diarios),
    ('Patamuslo c/ guarnición', 'papas fritas / ensalada o puré', 11900, cat_diarios),
    ('Bife de costilla c/ guarnición', 'papas fritas / ensalada o puré', 13900, cat_diarios),
    ('Pastel de papas', '', 11900, cat_diarios),
    ('Filet de merluza empanado o a la romana', '', 12900, cat_diarios),
    ('Lentejas a la española', '', 13900, cat_diarios);

    -- POSTRES
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Flan casero', 3500, cat_postres),
    ('Budín de pan', 3500, cat_postres),
    ('Helado', 4000, cat_postres),
    ('Ensalada de frutas', 4000, cat_postres);

    -- BEBIDAS
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Agua con o sin gas Ivess', 2500, cat_bebidas),
    ('Gaseosa línea Coca x 500 ml', 3900, cat_bebidas),
    ('Agua saborizada Aquarius x 500 ml', 3900, cat_bebidas),
    ('Cervezas', 0, cat_bebidas), -- Consultar disponibilidad (set to 0 for now)
    ('Vinos', 0, cat_bebidas); -- Consultar disponibilidad (set to 0 for now)

END $$;

COMMIT;
