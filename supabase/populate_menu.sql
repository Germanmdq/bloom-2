-- 1. INSERTAR CATEGORÍAS
INSERT INTO public.categories (id, name) VALUES
('specialty', 'Café de Especialidad'),
('bakery', 'Pastelería y Dulces'),
('plates', 'Almuerzo y Cena')
ON CONFLICT (id) DO NOTHING;

-- 2. INSERTAR PRODUCTOS
INSERT INTO public.products (id, category_id, name, description, price, image_url, active) VALUES
-- Specialty
('e1', 'specialty', 'Espresso Perfetto', 'Origen único, doble shot', 2300, '/images/espresso_explosion_1768310537479.png', true),
('e2', 'specialty', 'Velvet Latte', 'Leche sedosa con arte latte', 4100, '/images/latte_swirl_1768310553394.png', true),
('e3', 'specialty', 'Royal Mocha', 'Fusión de ganache de chocolate amargo', 6000, '/images/mocha_splash_1768310570273.png', true),
('e4', 'specialty', 'Flat White', 'Microespuma rica, cuerpo intenso', 4300, NULL, true),
('e5', 'specialty', 'Cold Brew', 'Extracción de 24h, final suave', 4500, NULL, true),

-- Bakery
('b1', 'bakery', 'Croissant', 'Capas de manteca, recién horneado', 2000, NULL, true),
('b2', 'bakery', 'Pain au Chocolat', 'Relleno de chocolate amargo', 2500, NULL, true),
('b3', 'bakery', 'Tostada de Palta', 'Huevo poché y semillas', 7400, NULL, true),
('b4', 'bakery', 'Budín de Limón', 'Glaseado cítrico', 3900, NULL, true),

-- Plates
('p1', 'plates', 'Ensalada César', 'Preparación clásica con aderezo casero', 7400, NULL, true),
('p2', 'plates', 'Hamburguesa Bloom', 'Carne premium, pan brioche', 10900, NULL, true),
('p3', 'plates', 'Salmón Grillado', 'Con vegetales asados de estación', 13900, NULL, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    active = true;
