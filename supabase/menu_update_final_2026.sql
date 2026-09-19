-- ============================================================================
-- MIGRACIÓN DE MENÚ BLOOM - ACTUALIZACIÓN FINAL PRECIOS ABRIL 2026
-- ============================================================================

DO $$
DECLARE
    cat_menu_dia uuid;
    cat_platos uuid;
    cat_postres uuid;
    cat_bebidas uuid;
    cat_ensaladas uuid;
    cat_tortillas uuid;
    cat_hamburguesas uuid;
    cat_milanesas uuid;
    cat_pastas uuid;
    cat_pizzas uuid;
    cat_empanadas uuid;
    cat_cafeteria uuid;
    cat_desayunos uuid;
    cat_promos uuid;
    cat_jugos uuid;
    cat_panificados uuid;
    cat_pasteleria uuid;
    
    -- Opciones
    opt_guarnicion jsonb := '[{"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]';
    opt_milanesa_plato jsonb := '[{"name": "Tipo", "values": ["Vacuna", "Pollo"]}, {"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]';
    opt_milanesa_sandwich jsonb := '[{"name": "Tipo", "values": ["Vacuna", "Pollo"]}]';
    opt_gusto_empanada jsonb := '[{"name": "Gusto", "values": ["Carne", "Pollo", "Jamón y Queso", "Choclo"]}]';
    opt_salsa_pasta jsonb := '[{"name": "Salsa", "values": ["Bolognesa", "Filetto", "Blanca", "Mixta"]}]';

BEGIN
    -- 1. Desvincular el Plato del Día para evitar el error de Foreign Key
    UPDATE app_settings SET plato_del_dia_id = NULL;

    -- 2. Limpiar para recargar con IDs frescos
    DELETE FROM products;
    DELETE FROM categories;

    -- 3. Crear Categorías
    INSERT INTO categories (name) VALUES ('Menú del Día') RETURNING id INTO cat_menu_dia;
    INSERT INTO categories (name) VALUES ('Platos Diarios') RETURNING id INTO cat_platos;
    INSERT INTO categories (name) VALUES ('Postres') RETURNING id INTO cat_postres;
    INSERT INTO categories (name) VALUES ('Bebidas') RETURNING id INTO cat_bebidas;
    INSERT INTO categories (name) VALUES ('Ensaladas') RETURNING id INTO cat_ensaladas;
    INSERT INTO categories (name) VALUES ('Tortillas') RETURNING id INTO cat_tortillas;
    INSERT INTO categories (name) VALUES ('Hamburguesas') RETURNING id INTO cat_hamburguesas;
    INSERT INTO categories (name) VALUES ('Milanesas') RETURNING id INTO cat_milanesas;
    INSERT INTO categories (name) VALUES ('Pastas') RETURNING id INTO cat_pastas;
    INSERT INTO categories (name) VALUES ('Pizzas') RETURNING id INTO cat_pizzas;
    INSERT INTO categories (name) VALUES ('Empanadas') RETURNING id INTO cat_empanadas;
    INSERT INTO categories (name) VALUES ('Cafetería') RETURNING id INTO cat_cafeteria;
    INSERT INTO categories (name) VALUES ('Desayunos y Meriendas') RETURNING id INTO cat_desayunos;
    INSERT INTO categories (name) VALUES ('Promociones') RETURNING id INTO cat_promos;
    INSERT INTO categories (name) VALUES ('Jugos y Licuados') RETURNING id INTO cat_jugos;
    INSERT INTO categories (name) VALUES ('Panificados') RETURNING id INTO cat_panificados;
    INSERT INTO categories (name) VALUES ('Pastelería') RETURNING id INTO cat_pasteleria;

    -- 4. Insertar Productos con PRECIOS ACTUALIZADOS

    -- MENÚ DEL DÍA (Incluye bebida)
    INSERT INTO products (name, price, category_id, description) VALUES
    ('Menú del Día Completo', 13500, cat_menu_dia, 'Plato del día + Bebida incluida');

    -- CAFETERÍA
    INSERT INTO products (name, price, category_id, options) VALUES
    ('Café Pocillo', 2600, cat_cafeteria, '[{"name": "Variedad", "values": ["Espresso", "Cortado", "Ristretto"]}]'),
    ('Café Jarrito', 3500, cat_cafeteria, '[{"name": "Variedad", "values": ["Café", "Cortado", "Lágrima"]}]'),
    ('Café con Crema (Jarrito)', 4800, cat_cafeteria, NULL),
    ('Café c/ Leche - Lágrima Doble', 4800, cat_cafeteria, NULL),
    ('Café Doble / Cortado Doble', 5000, cat_cafeteria, NULL),
    ('Té / Saborizado / Mate Cocido', 3300, cat_cafeteria, NULL),
    ('Té c/ Leche / Mate Cocido c/ Leche', 3700, cat_cafeteria, NULL),
    ('Capuccino', 6900, cat_cafeteria, NULL),
    ('Submarino', 6900, cat_cafeteria, NULL),
    ('Chocolatada', 5200, cat_cafeteria, NULL);

    -- DESAYUNOS Y MERIENDAS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Clásico', 'Infusión + 3 medialunas + 1/2 exprimido', 12000, cat_desayunos),
    ('Saludable', 'Infusión + 2 tostadas pan de campo c/ queso + 1/2 exprimido', 12000, cat_desayunos),
    ('Continental', 'Infusión + 2 medialunas + 1/2 tostado + 1/2 exprimido', 13700, cat_desayunos),
    ('Bloom', 'Infusión + tostadas c/ huevo revuelto y palta + 1/2 exprimido', 16900, cat_desayunos),
    ('Yogurt c/ fruta y granola', NULL, 5700, cat_desayunos);

    -- PROMOCIONES
    INSERT INTO products (name, price, category_id) VALUES
    ('Café c/ Leche + 2 Facturas', 6400, cat_promos),
    ('Café c/ Leche + 2 Medialunas JyQ', 7900, cat_promos),
    ('Jarrito + 1 Factura', 4200, cat_promos),
    ('Jarrito + 2 Facturas', 4600, cat_promos);

    -- JUGOS Y LICUADOS
    INSERT INTO products (name, price, category_id) VALUES
    ('Exprimido de Naranja', 6500, cat_jugos),
    ('Medio Exprimido', 4500, cat_jugos),
    ('Naranjada', 7500, cat_jugos),
    ('Limonada', 7500, cat_jugos),
    ('Licuado (banana / frutilla)', 7500, cat_jugos);

    -- PANIFICADOS
    INSERT INTO products (name, price, category_id) VALUES
    ('Tostadas (2 un)', 4500, cat_panificados),
    ('1/2 Porción Tostadas (1 un)', 2500, cat_panificados),
    ('Factura (Unidad)', 1200, cat_panificados),
    ('Medialuna JyQ', 2300, cat_panificados),
    ('Tostado de Miga', 6500, cat_panificados),
    ('1/2 Tostado de Miga', 3700, cat_panificados),
    ('Tostado de Pan Árabe', 6500, cat_panificados),
    ('Tostadas c/ Huevo y Palta (2 un)', 8500, cat_panificados);

    -- PASTELERÍA
    INSERT INTO products (name, price, category_id) VALUES
    ('Tarta de Coco', 8700, cat_pasteleria),
    ('Lemon Pie', 8700, cat_pasteleria),
    ('Brownie c/ Merengue', 8700, cat_pasteleria),
    ('Cookie', 5600, cat_pasteleria),
    ('Alfajor Deguido', 3500, cat_pasteleria),
    ('Alfajor de Maicena', 3900, cat_pasteleria),
    ('Porción Sin TACC (Budín)', 5500, cat_pasteleria),
    ('Alfajor Sin TACC', 4500, cat_pasteleria);

    -- ENSALADAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Caesar', 8200, cat_ensaladas),
    ('Ensalada Bloom', 9500, cat_ensaladas),
    ('Ensalada Liviana', 9500, cat_ensaladas),
    ('Ensalada Criolla', 7200, cat_ensaladas),
    ('Lechuga y Tomate', 6500, cat_ensaladas),
    ('Zanahoria y Huevo', 6500, cat_ensaladas),
    ('Rúcula y Parmesano', 7500, cat_ensaladas),
    ('Zanahoria, Huevo, Choclo y Lentejas', 8200, cat_ensaladas);

    -- PASTAS
    INSERT INTO products (name, price, category_id, options) VALUES
    ('Spaghettis', 10500, cat_pastas, opt_salsa_pasta),
    ('Ñoquis de Papa', 11500, cat_pastas, opt_salsa_pasta),
    ('Ravioles de Calabaza y Ricota', 11500, cat_pastas, opt_salsa_pasta),
    ('Sorrentinos de Jamón y Queso', 11500, cat_pastas, opt_salsa_pasta),
    ('Ravioles de Verdura', 11500, cat_pastas, opt_salsa_pasta),
    ('Canelones de Verdura y Ricota', 11500, cat_pastas, opt_salsa_pasta);

    -- PIZZAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Pizza Muzzarella', 12500, cat_pizzas),
    ('Pizza Especial', 13900, cat_pizzas),
    ('Pizza Napolitana', 14900, cat_pizzas),
    ('Pizza Rúcula, Crudo y Parmesano', 16900, cat_pizzas);

    -- TORTILLAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Tortilla Clásica', 8900, cat_tortillas),
    ('Tortilla Bloom (JyQ)', 9900, cat_tortillas);

    -- HAMBURGUESAS (Incluyen papas)
    INSERT INTO products (name, price, category_id) VALUES
    ('Hamburguesa Sola', 12500, cat_hamburguesas),
    ('Hamburguesa JyQ', 13900, cat_hamburguesas),
    ('Hamburguesa Completa', 15000, cat_hamburguesas);

    -- MILANESAS (Incluyen papas)
    INSERT INTO products (name, price, category_id, options) VALUES
    ('Milanesa Sola', 12500, cat_milanesas, opt_milanesa_plato),
    ('Milanesa JyQ', 13900, cat_milanesas, opt_milanesa_plato),
    ('Milanesa Napolitana Especial', 16900, cat_milanesas, opt_milanesa_plato),
    ('Milanesa Completa', 15000, cat_milanesas, opt_milanesa_plato),
    ('Sándwich de Milanesa', 10500, cat_milanesas, opt_milanesa_sandwich),
    ('Sándwich Milanesa Completo c/ Fritas', 12500, cat_milanesas, opt_milanesa_sandwich);

    -- EMPANADAS
    INSERT INTO products (name, price, category_id, options) VALUES
    ('Empanada (Unidad)', 1800, cat_empanadas, opt_gusto_empanada),
    ('1/2 Docena Empanadas', 9900, cat_empanadas, NULL),
    ('Docena Empanadas', 18000, cat_empanadas, NULL);

    -- PLATOS DIARIOS
    INSERT INTO products (name, price, category_id) VALUES
    ('Arroz con Pollo', 13500, cat_platos),
    ('Albóndigas con Puré', 13500, cat_platos),
    ('Pechuga Grillé c/ Guarnición', 13500, cat_platos),
    ('Patamuslo c/ Guarnición', 13500, cat_platos),
    ('Pastel de Papas', 13500, cat_platos),
    ('Filet de Merluza (Emp/Rom)', 12900, cat_platos),
    ('Lentejas a la Española', 14500, cat_platos),
    ('Bife de Costilla c/ Guarnición', 15900, cat_platos);

    -- POSTRES
    INSERT INTO products (name, price, category_id) VALUES
    ('Flan Casero', 4000, cat_postres),
    ('Budín de Pan', 4000, cat_postres),
    ('Helado', 4900, cat_postres),
    ('Ensalada de Frutas', 4900, cat_postres);

    -- BEBIDAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Agua con o sin gas Ivess', 2900, cat_bebidas),
    ('Gaseosa Línea Coca 500ml', 3900, cat_bebidas),
    ('Agua Saborizada Aquarius 500ml', 3900, cat_bebidas);

END $$;
