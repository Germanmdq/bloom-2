-- 1. LIMPIAR DATOS PREVIOS (Opcional, para asegurar consistencia)
TRUNCATE public.products CASCADE;
TRUNCATE public.categories CASCADE;

-- 2. INSERTAR CATEGORÍAS CON UUIDs VÁLIDOS
-- Usamos UUIDs fijos para poder linkear los productos fácilmente
INSERT INTO public.categories (id, name) VALUES
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Café de Especialidad'),
('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Pastelería y Dulces'),
('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Almuerzo y Cena')
ON CONFLICT (id) DO NOTHING;

-- 3. INSERTAR PRODUCTOS ASOCIADOS
INSERT INTO public.products (category_id, name, description, price, active) VALUES
-- Café
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Espresso Perfetto', 'Origen único, doble shot', 2300, true),
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Velvet Latte', 'Leche sedosa con arte latte', 4100, true),
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Royal Mocha', 'Fusión de ganache de chocolate amargo', 6000, true),
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Flat White', 'Microespuma rica, cuerpo intenso', 4300, true),

-- Pastelería
('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Croissant', 'Capas de manteca, recién horneado', 2000, true),
('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Pain au Chocolat', 'Relleno de chocolate amargo', 2500, true),
('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Tostada de Palta', 'Huevo poché y semillas', 7400, true),

-- Platos
('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Ensalada César', 'Preparación clásica con aderezo casero', 7400, true),
('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Hamburguesa Bloom', 'Carne premium, pan brioche', 10900, true);
