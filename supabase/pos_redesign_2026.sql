CREATE TABLE IF NOT EXISTS salon_tables (
    id INTEGER PRIMARY KEY,
    status TEXT DEFAULT 'FREE',
    total NUMERIC DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE salon_tables ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'LOCAL';
ALTER TABLE salon_tables ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
ALTER TABLE salon_tables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'FREE';

CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id INTEGER,
    total NUMERIC DEFAULT 0,
    payment_method TEXT,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    waiter_id UUID,
    stock_applied BOOLEAN DEFAULT FALSE,
    order_type TEXT DEFAULT 'LOCAL',
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    delivery_notes TEXT,
    status TEXT DEFAULT 'OPEN'
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 99;

DELETE FROM salon_tables; 

DO $$
BEGIN
    FOR i IN 1..49 LOOP
        INSERT INTO salon_tables (id, status, total, order_type) VALUES (i, 'FREE', 0, 'LOCAL');
    END LOOP;

    FOR i IN 50..99 LOOP
        INSERT INTO salon_tables (id, status, total, order_type) VALUES (i, 'FREE', 0, 'DELIVERY');
    END LOOP;

    FOR i IN 100..150 LOOP
        INSERT INTO salon_tables (id, status, total, order_type) VALUES (i, 'FREE', 0, 'RETIRO');
    END LOOP;
END $$;

UPDATE categories SET icon = '☕', sort_order = 1 WHERE name ILIKE '%Cafetería%' OR name ILIKE '%Cafeteria%';
UPDATE categories SET icon = '🥐', sort_order = 2 WHERE name ILIKE '%Desayuno%';
UPDATE categories SET icon = '🧃', sort_order = 3 WHERE name ILIKE '%Jugos%';
UPDATE categories SET icon = '🥖', sort_order = 4 WHERE name ILIKE '%Panificados%';
UPDATE categories SET icon = '🍰', sort_order = 5 WHERE name ILIKE '%Pastelería%' OR name ILIKE '%Pasteleria%';
UPDATE categories SET icon = '🥗', sort_order = 6 WHERE name ILIKE '%Ensaladas%';
UPDATE categories SET icon = '🍝', sort_order = 7 WHERE name ILIKE '%Pastas%';
UPDATE categories SET name = 'BEBIDAS SIN ALCOHOL', icon = '🥤', sort_order = 8 WHERE name = 'Bebidas';
UPDATE categories SET icon = '🍗', sort_order = 9 WHERE name ILIKE '%Milanesas%';
UPDATE categories SET icon = '🍔', sort_order = 10 WHERE name ILIKE '%Hamburguesas%';
UPDATE categories SET name = 'TARTAS Y EMPANADAS', icon = '🥟', sort_order = 11 WHERE name ILIKE '%Empanadas%';
UPDATE categories SET icon = '🍕', sort_order = 12 WHERE name ILIKE '%Pizzas%';
UPDATE categories SET name = 'ALMUERZOS Y CENAS', icon = '🍽️', sort_order = 13 WHERE name ILIKE '%Platos Diarios%';
UPDATE categories SET icon = '🎁', sort_order = 14 WHERE name ILIKE '%Promociones%';
UPDATE categories SET icon = '🍨', sort_order = 15 WHERE name ILIKE '%Postres%';

INSERT INTO categories (name, icon, sort_order) SELECT 'DELIVERY', '🛵', 16 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'DELIVERY');
INSERT INTO categories (name, icon, sort_order) SELECT 'PAPAS FRITAS', '🍟', 17 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PAPAS FRITAS');
INSERT INTO categories (name, icon, sort_order) SELECT 'SALSAS', '🥫', 18 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'SALSAS');
INSERT INTO categories (name, icon, sort_order) SELECT 'BEBIDAS CON ALCOHOL', '🍺', 19 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'BEBIDAS CON ALCOHOL');
INSERT INTO categories (name, icon, sort_order) SELECT 'TORTILLAS', '🌮', 20 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Tortillas');

UPDATE categories SET icon = '🌯', sort_order = 21 WHERE name ILIKE '%Wraps%';
