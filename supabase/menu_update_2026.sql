-- ============================================================================
-- MIGRACIÓN DE MENÚ BLOOM - 2026 (FINAL CON OPCIONES MILANESA)
-- Instrucciones: Copia y pega todo este contenido en el SQL Editor de Supabase y dale RUN.
-- ============================================================================

-- 1. Agregar columna de opciones si no existe
ALTER TABLE products ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT; 

-- 2. Limpiar menú anterior para recargar
DELETE FROM products;
DELETE FROM categories;

-- 3. Insertar Nuevas Categorías y Productos
DO $$
DECLARE
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
    cat_wraps uuid;
    
    -- Opciones Comunes
    opt_guarnicion jsonb := '[{"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]';
    -- Milanesas: Carne/Pollo + Guarnición
    opt_milanesa_plato jsonb := '[{"name": "Tipo", "values": ["Vacuna", "Pollo"]}, {"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]';
    -- Sandwich Milanesa: Solo Carne/Pollo (Guarnición definida por item)
    opt_milanesa_sandwich jsonb := '[{"name": "Tipo", "values": ["Vacuna", "Pollo"]}]';
    
    opt_gusto_empanada jsonb := '[{"name": "Gusto", "values": ["Carne", "Pollo", "Jamón y Queso", "Choclo"]}]';
    opt_salsa_pasta jsonb := '[{"name": "Salsa", "values": ["Bolognesa", "Filetto", "Blanca", "Mixta"]}]';
    opt_cafe_tipo jsonb := '[{"name": "Variedad", "values": ["Café", "Cortado", "Lágrima"]}]';

BEGIN
    -- Crear Categorías y guardar IDs
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
    INSERT INTO categories (name) VALUES ('Wraps') RETURNING id INTO cat_wraps;

    -- Insertar Productos
    
    -- PLATOS DIARIOS
    INSERT INTO products (name, price, category_id, options) VALUES
    ('Arroz con pollo', 11900, cat_platos, NULL),
    ('Albondigas con puré', 11900, cat_platos, NULL),
    ('Pechuga Grillé', 11900, cat_platos, opt_guarnicion),
    ('Patamuslo', 11900, cat_platos, opt_guarnicion),
    ('Bife de Costilla', 13900, cat_platos, opt_guarnicion),
    ('Pastel de Papas', 11900, cat_platos, NULL),
    ('Filet de Merluza', 12900, cat_platos, '[{"name": "Preparación", "values": ["Empanado", "A la Romana"]}, {"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]'),
    ('Lentejas a la Española', 13900, cat_platos, NULL);

    -- POSTRES
    INSERT INTO products (name, price, category_id) VALUES
    ('Flan Casero', 3500, cat_postres),
    ('Budín de Pan', 3500, cat_postres),
    ('Helado', 4000, cat_postres),
    ('Ensalada de Frutas', 4000, cat_postres);

    -- BEBIDAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Agua Ivess', 2500, cat_bebidas),
    ('Gaseosa Línea Coca 500ml', 3900, cat_bebidas),
    ('Agua Aquarius 500ml', 3900, cat_bebidas),
    ('Cerveza', 0, cat_bebidas),
    ('Vino', 0, cat_bebidas);

    -- ENSALADAS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Caesar', 'Lechuga, pollo, croutons, salsa caesar', 7400, cat_ensaladas),
    ('Bloom', 'Lechuga, tomate, zanahoria, huevo, pollo, choclo', 8600, cat_ensaladas),
    ('Liviana', 'Rúcula, parmesano, cherry, champignones, queso', 8600, cat_ensaladas),
    ('Criolla', 'Lechuga, tomate, cebolla', 6200, cat_ensaladas),
    ('Lechuga y Tomate', 'Clásica', 6000, cat_ensaladas),
    ('Zanahoria y Huevo', 'Clásica', 6000, cat_ensaladas),
    ('Rúcula y Parmesano', 'Clásica', 6500, cat_ensaladas),
    ('Mix Vegetariano', 'Zanahoria, huevo, choclo y lentejas', 7400, cat_ensaladas);

    -- TORTILLAS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Tortilla Clásica', 'Papa, huevo, cebolla y morrón', 7900, cat_tortillas),
    ('Tortilla Bloom', 'Papa, huevo, cebolla, morrón, jamón y queso', 8900, cat_tortillas);

    -- HAMBURGUESAS (Solo guarnición, carne es carne)
    INSERT INTO products (name, description, price, category_id, options) VALUES
    ('Hamburguesa Sola', 'Con guarnición a elección', 10900, cat_hamburguesas, opt_guarnicion),
    ('Hamburguesa JyQ', 'Con jamón y queso, guarnición a elección', 11900, cat_hamburguesas, opt_guarnicion),
    ('Hamburguesa Completa', 'Completa con guarnición a elección', 13200, cat_hamburguesas, opt_guarnicion);

    -- MILANESAS (Carne/Pollo + Guarnición)
    INSERT INTO products (name, description, price, category_id, options) VALUES
    ('Milanesa Sola', 'Con guarnición a elección', 10900, cat_milanesas, opt_milanesa_plato),
    ('Milanesa JyQ', 'Con jamón y queso, guarnición a elección', 11900, cat_milanesas, opt_milanesa_plato),
    ('Napolitana Especial', 'Con guarnición a elección', 14500, cat_milanesas, opt_milanesa_plato),
    ('Milanesa Completa', 'Con guarnición a elección', 13200, cat_milanesas, opt_milanesa_plato),
    ('Sandwich de Milanesa', 'Solo sandwich', 8900, cat_milanesas, opt_milanesa_sandwich),
    ('Sandwich Milanesa Completo', 'Lechuga, tomate, jamón, queso y fritas', 10800, cat_milanesas, opt_milanesa_sandwich);

    -- PASTAS
    INSERT INTO products (name, price, category_id, options) VALUES
    ('Spaghettis', 8900, cat_pastas, opt_salsa_pasta),
    ('Ñoquis de Papa', 9900, cat_pastas, opt_salsa_pasta),
    ('Ravioles Calabaza y Ricota', 9900, cat_pastas, opt_salsa_pasta),
    ('Sorrentinos JyQ', 9900, cat_pastas, opt_salsa_pasta),
    ('Ravioles de Verdura', 9900, cat_pastas, opt_salsa_pasta),
    ('Canelones', 9900, cat_pastas, opt_salsa_pasta);

    -- PIZZAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Pizza Muzzarella', 10900, cat_pizzas),
    ('Pizza Especial', 11900, cat_pizzas),
    ('Pizza Napolitana', 11900, cat_pizzas),
    ('Pizza Rúcula y Crudo', 13900, cat_pizzas);

    -- EMPANADAS
    INSERT INTO products (name, description, price, category_id, options) VALUES
    ('Empanada (Unidad)', 'Carne, Pollo, Jamón y Queso, Choclo', 1600, cat_empanadas, opt_gusto_empanada),
    ('Media Docena Empanadas', 'Selección de la casa o aclarar en notas', 8900, cat_empanadas, NULL),
    ('Docena Empanadas', 'Selección de la casa o aclarar en notas', 17000, cat_empanadas, NULL);

    -- CAFETERÍA (Con opciones de variedad)
    INSERT INTO products (name, price, category_id, options) VALUES
    ('Café Pocillo', 2300, cat_cafeteria, '[{"name": "Variedad", "values": ["Espresso", "Cortado", "Ristretto"]}]'),
    ('Café Jarrito', 3000, cat_cafeteria, opt_cafe_tipo), 
    ('Café Doble', 4100, cat_cafeteria, NULL),
    ('Café con Crema', 4100, cat_cafeteria, NULL),
    ('Café con Leche / Lágrima Doble', 4300, cat_cafeteria, NULL),
    ('Café Doble / Cortado Doble', 2800, cat_cafeteria, NULL), 
    ('Té / Mate Cocido', 3200, cat_cafeteria, NULL),
    ('Té con Leche', 6000, cat_cafeteria, NULL),
    ('Capuccino', 6000, cat_cafeteria, NULL),
    ('Submarino', 6000, cat_cafeteria, NULL),
    ('Chocolatada', 4500, cat_cafeteria, NULL);

    -- DESAYUNOS Y MERIENDAS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Desayuno Clásico', 'Infusión + 3 medialunas + ½ exprimido', 10500, cat_desayunos),
    ('Desayuno Saludable', 'Infusión + 2 tostadas pan de campo c/ queso + ½ exprimido', 10500, cat_desayunos),
    ('Desayuno Continental', 'Infusión + 2 medialunas + ½ tostada + ½ exprimido', 11900, cat_desayunos),
    ('Desayuno Bloom', 'Infusión + tostadas c/ huevo revuelto y palta + ½ exprimido', 14900, cat_desayunos),
    ('Yogurt con Frutas', 'Con fruta y granola', 4900, cat_desayunos);

    -- PROMOCIONES
    INSERT INTO products (name, price, category_id) VALUES
    ('Café c/ Leche + 2 Facturas', 5500, cat_promos),
    ('Café c/ Leche + 2 Medialunas JyQ', 6900, cat_promos),
    ('Jarrito + 1 Factura', 3600, cat_promos),
    ('Jarrito + 2 Facturas', 4000, cat_promos);

    -- JUGOS
    INSERT INTO products (name, price, category_id) VALUES
    ('Jugos y Licuados Variados', 5900, cat_jugos),
    ('Exprimido de Naranja', 3800, cat_jugos),
    ('Medio Exprimido', 6500, cat_jugos), 
    ('Naranjada', 6500, cat_jugos),
    ('Limonada', 6500, cat_jugos),
    ('Licuado (Banana/Frutilla)', 6500, cat_jugos);

    -- PANIFICADOS
    INSERT INTO products (name, price, category_id) VALUES
    ('Tostadas (2 un)', 3900, cat_panificados),
    ('Media Tostada (1 un)', 2100, cat_panificados),
    ('Facturas (u)', 1000, cat_panificados),
    ('Medialuna JyQ', 2000, cat_panificados),
    ('Tostado de Miga', 5600, cat_panificados),
    ('Medio Tostado Miga', 3200, cat_panificados),
    ('Tostado Pan Árabe', 6000, cat_panificados), 
    ('Tostadas c/ Huevo y Palta', 7400, cat_panificados);

    -- PASTELERÍA
    INSERT INTO products (name, price, category_id) VALUES
    ('Tarta de Coco', 7500, cat_pasteleria),
    ('Lemon Pie', 7500, cat_pasteleria),
    ('Brownie c/ Merengue', 7500, cat_pasteleria),
    ('Budín Limón y Amapolas', 3900, cat_pasteleria),
    ('Alfajor Deguido', 3500, cat_pasteleria),
    ('Alfajor Maicena', 3500, cat_pasteleria),
    ('Porción Sin TACC', 2500, cat_pasteleria),
    ('Cookies / Barritas', 3900, cat_pasteleria);

    -- WRAPS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Wrap Primavera', 'Jamón, queso, lechuga, tomate y huevo', 6900, cat_wraps),
    ('Wrap Rúcula', 'Rúcula, queso parmesano, zanahoria y cherry', 6900, cat_wraps),
    ('Wrap Caesar', 'Lechuga, pollo, queso parmesano y salsa Caesar', 6900, cat_wraps),
    ('Wrap Carne', 'Carne tiernizada, cebolla caramelizada y cheddar', 8500, cat_wraps);
END $$;
