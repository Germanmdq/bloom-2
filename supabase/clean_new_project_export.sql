-- ====================================================================
-- BLOOM CAFÉ & POS - SCRIPT DE INICIALIZACIÓN PARA NUEVO PROYECTO SUPABASE
-- Contiene: Esquema completo + 20 Categorías + 127 Productos + Configuración
-- Excluye: Historial de órdenes antiguas y comandas de prueba (Base limpia)
-- Fecha de generación: 2026-09-19T14:55:21.417Z
-- ====================================================================

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. TIPOS Y ENUMS
-- ====================================================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WAITER', 'KITCHEN', 'MANAGER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.table_status AS ENUM ('FREE', 'OCCUPIED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('CASH', 'CARD', 'MERCADO_PAGO', 'TRANSFER', 'PENDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ====================================================================
-- 2. TABLAS PRINCIPALES
-- ====================================================================

-- Categorías
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER,
    sales_count INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos del Menú y Catálogo
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    kind TEXT,
    unit TEXT,
    track_stock BOOLEAN DEFAULT false,
    min_stock INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0,
    vendidos INTEGER DEFAULT 0,
    total_vendidos INTEGER DEFAULT 0,
    options JSONB,
    raw_product_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuración del Local
CREATE TABLE IF NOT EXISTS public.app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    mesas INTEGER DEFAULT 40,
    barra INTEGER DEFAULT 3,
    whatsapp TEXT,
    site_url TEXT,
    plato_del_dia_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    plato_dia_price DECIMAL(10,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Perfiles de Usuarios / Staff / Clientes
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.user_role DEFAULT 'WAITER'::public.user_role NOT NULL,
    is_customer BOOLEAN DEFAULT false,
    coffee_stamps INTEGER DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    customer_number TEXT,
    birthday DATE,
    birthdate DATE,
    phone TEXT,
    cuit TEXT,
    default_address TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes y Fidelidad
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    balance DECIMAL(10,2) DEFAULT 0,
    loyalty_stamps INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mesas del Salón
CREATE TABLE IF NOT EXISTS public.salon_tables (
    id INTEGER PRIMARY KEY,
    status public.table_status DEFAULT 'FREE',
    total DECIMAL(10,2) DEFAULT 0,
    current_order_id UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Órdenes y Ventas (Inicia vacía para el nuevo proyecto)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id INTEGER,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    order_type TEXT DEFAULT 'WEB',
    delivery_type TEXT,
    delivery_info TEXT,
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    paid BOOLEAN DEFAULT false,
    cuenta_corriente BOOLEAN DEFAULT false,
    stock_applied BOOLEAN DEFAULT true,
    stock_deducted BOOLEAN DEFAULT true,
    payment_method TEXT DEFAULT 'PENDING',
    payment_notes TEXT,
    cae TEXT,
    voucher_number TEXT,
    cae_expiration TEXT,
    debt_payment_amount DECIMAL(12,2) DEFAULT 0,
    waiter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Comandas de Cocina (KDS)
CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL DEFAULT 0,
    items JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gastos del Local
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proveedores
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    cuit TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 3. POLÍTICAS DE SEGURIDAD (RLS)
-- ====================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Acceso público (anon + auth) para lectura de menú y categorías
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- Permitir crear pedidos y comandas desde la PWA / mesas
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public insert kitchen" ON public.kitchen_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read kitchen" ON public.kitchen_tickets FOR SELECT USING (true);

-- Permisos totales para usuarios autenticados (Dashboard / Empleados)
CREATE POLICY "Auth full categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full app_settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full salon_tables" ON public.salon_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full kitchen_tickets" ON public.kitchen_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================================================
-- 4. INSERTAR CATEGORÍAS (20)
-- ====================================================================
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Plato del Día', NULL, 6, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Cafetería Delivery', '🚚', 12, 2815, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('5f519a10-4aef-4076-87cc-556387f3720b', 'Tartas Individuales', NULL, 20, 163, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('13721c38-96b5-46ec-a28b-5ce995199ab4', 'Sandwiches', NULL, 21, 608, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('1902ae8a-f589-4589-b25e-405d6af5d559', 'Ensaladas', NULL, NULL, 69, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('747e3b05-aee8-4c35-a685-9f1e9a8a5514', 'Hamburguesas', NULL, NULL, 51, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('9107d565-bf72-45cf-bd03-b814484feb0b', 'Postres', NULL, NULL, 156, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('9ebaf26f-2380-4ade-8ae7-e8e67e575444', 'Bebidas', NULL, NULL, 291, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('f24aeb5d-42a8-4a09-86e6-83f6c499295c', 'Pizzas', NULL, NULL, 21, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('9211e165-5b1d-4762-a65d-e16220d35bd7', 'Cafetería', NULL, NULL, 3716, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('2a86814a-4b4f-4101-82c4-aa7e65848730', 'Desayunos y Meriendas', NULL, NULL, 1091, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('49718b11-0270-4ab9-82f6-4a3f209bebe9', 'Promociones', NULL, NULL, 1848, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('2cb3f16a-be9c-4e6c-822c-b424a2d4a0ee', 'Panificados', NULL, NULL, 439, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Pastelería', NULL, NULL, 94, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('b2fa234e-3931-4536-8432-dc7960c86ca0', 'Jugos y Licuados', NULL, NULL, 152, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('8f94bd65-8f3b-4638-ab1e-2d2a87f82fa7', 'Milanesas', NULL, NULL, 98, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('b0825cf2-12f8-47dc-a561-56ef66508a13', 'Pastas', NULL, NULL, 68, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('309e88a1-5663-4e50-8a9e-f9f48c4d55a1', 'Tortillas', NULL, NULL, 51, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('77d9e712-1db6-439e-bdcf-f3c7574e9ffe', 'Empanadas', NULL, NULL, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;
INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES ('4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Platos Diarios', NULL, NULL, 699, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;

-- ====================================================================
-- 5. INSERTAR PRODUCTOS (127)
-- ====================================================================
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('a264de05-1161-4556-bbc3-ca09427aa096', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Pastel de Papas', NULL, 14500, NULL, true, 'menu', NULL, false, 0, -105, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('06b82525-e32e-446f-8c61-ebfbd09ea9d4', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Té / Saborizado / Mate Cocido', NULL, 3500, '/images/products/te-mate-cocido.jpeg', true, 'menu', NULL, false, 0, -142, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('65e89939-66e5-42d0-b0f8-3bddbda72e6c', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Té c/ Leche / Mate Cocido c/ Leche', NULL, 4000, '/images/products/te-mate-cocido-leche.jpeg', true, 'menu', NULL, false, 0, -33, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('660344ae-bfb3-40cc-9c4e-9c0d7dc498c7', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Medialuna JyQ', NULL, 2500, NULL, true, 'menu', NULL, false, 0, -129, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('149dbc37-91b8-4f1c-80aa-8983840f1358', 'b2fa234e-3931-4536-8432-dc7960c86ca0', 'Exprimido de Naranja', NULL, 7200, NULL, true, 'menu', NULL, false, 0, -59, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c8952e93-dfe2-4a99-92be-1b3d1e2661d6', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Yogurt c/ fruta y granola', NULL, 6000, NULL, true, 'menu', NULL, false, 0, -45, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('de07641a-eee6-4fdf-ab30-111da895530a', '1902ae8a-f589-4589-b25e-405d6af5d559', 'Lechuga y Tomate', NULL, 7000, '/images/products/ensalada-lechuga-tomate.jpeg', true, 'menu', NULL, false, 0, -5, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('910705c6-d6aa-47e0-ba82-8dbf040a3f72', '747e3b05-aee8-4c35-a685-9f1e9a8a5514', 'Hamburguesa JyQ', NULL, 14500, NULL, true, 'menu', NULL, false, 0, -48, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('cc208792-d25f-4200-aa26-93b4a7374427', 'b0825cf2-12f8-47dc-a561-56ef66508a13', 'Spaghettis', NULL, 10800, NULL, true, 'menu', NULL, false, 0, -6, '[{"name":"Salsa","values":["Bolognesa","Filetto","Blanca","Mixta"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('ef261934-4155-4872-b877-afada4304e5f', 'f24aeb5d-42a8-4a09-86e6-83f6c499295c', 'Pizza Napolitana', NULL, 15500, NULL, true, 'menu', NULL, false, 0, -8, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('5dd8bab1-ba2c-4921-ba74-347053843e4c', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Bloom', 'Infusión + tostadas c/ huevo revuelto y palta + 1/2 exprimido', 18100, NULL, true, 'menu', NULL, false, 0, -9, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('555f4ac6-c683-4073-af6e-8835b97a1964', '13721c38-96b5-46ec-a28b-5ce995199ab4', 'Tostado de Miga', NULL, 6800, NULL, true, 'menu', NULL, false, 0, -108, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('e615af9b-51b9-481e-885c-e244bf90f717', 'b2fa234e-3931-4536-8432-dc7960c86ca0', 'Licuado (banana / frutilla)', NULL, 8000, '/images/products/licuado-banana-frutilla.jpeg', true, 'menu', NULL, false, 0, -20, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('b71df6e6-2dfe-46a1-b73f-8bdc9907689e', '747e3b05-aee8-4c35-a685-9f1e9a8a5514', 'Hamburguesa Completa', NULL, 16000, NULL, true, 'menu', NULL, false, 0, -14, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('b3c95a04-1185-40cf-a841-f50f5ef3a36b', '8f94bd65-8f3b-4638-ab1e-2d2a87f82fa7', 'Milanesa JyQ', NULL, 14500, NULL, true, 'menu', NULL, false, 0, -10, '[{"name":"Tipo","values":["Vacuna","Pollo"]},{"name":"Guarnición","values":["Papas Fritas","Ensalada","Puré"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('a79c83f7-08db-4140-b419-1e02c7c918a7', '49718b11-0270-4ab9-82f6-4a3f209bebe9', 'Café c/ Leche + 2 Medialunas JyQ', NULL, 8400, NULL, true, 'menu', NULL, false, 0, -78, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('94409f15-b3e0-4e55-8b4b-c2e34ecb6f8e', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Porción Sin TACC (Budín)', NULL, 4800, '/images/products/budin-sin-tacc.jpeg', true, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('b2d6e0ff-9193-44c4-a195-6eb52866c487', '49718b11-0270-4ab9-82f6-4a3f209bebe9', 'Jarrito + 1 Factura', NULL, 4900, NULL, true, 'menu', NULL, false, 0, -662, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('b5b1ff00-2966-4a1e-a106-edc8e25c343f', 'f24aeb5d-42a8-4a09-86e6-83f6c499295c', 'Pizza Rúcula, Crudo y Parmesano', NULL, 16900, NULL, true, 'menu', NULL, false, 0, -3, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('75d8061c-d04a-460e-a28b-06b9180c9e70', '309e88a1-5663-4e50-8a9e-f9f48c4d55a1', 'Tortilla Clásica', NULL, 9600, '/images/products/tortilla-clasica.jpeg', true, 'menu', NULL, false, 0, -62, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('bd1e6a5f-afb8-4391-83fa-ba42592adcd9', 'b0825cf2-12f8-47dc-a561-56ef66508a13', 'Sorrentinos de Jamón y Queso', NULL, 12000, NULL, true, 'menu', NULL, false, 0, -11, '[{"name":"Salsa","values":["Bolognesa","Filetto","Blanca","Mixta"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('6d4a4a5d-4d71-45a6-a2f0-8a023da0e958', '13721c38-96b5-46ec-a28b-5ce995199ab4', '1/2 Tostado de Miga', NULL, 4000, NULL, true, 'menu', NULL, false, 0, -88, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('bcd779fd-9ac4-436c-a485-0360084e5068', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Tostadas (2 un)', NULL, 4900, '/images/products/tostadas.jpeg', true, 'menu', NULL, false, 0, -153, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c79baf7e-b1c7-44d0-92ef-d5f61f76100b', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Lentejas a la Española', NULL, 16900, NULL, true, 'menu', NULL, false, 0, -21, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('109657d5-8bf2-4bfe-adff-902b323f7112', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Patamuslo c/ Guarnición', NULL, 14500, '/images/products/patamuslo-guarnicion.jpeg', true, 'menu', NULL, false, 0, -8, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('0148c4a8-1c69-4e9d-a2c6-dc02bafa3680', 'b0825cf2-12f8-47dc-a561-56ef66508a13', 'Ravioles de Verdura', NULL, 12000, NULL, true, 'menu', NULL, false, 0, -14, '[{"name":"Salsa","values":["Bolognesa","Filetto","Blanca","Mixta"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('15f28df6-d9fd-46d0-922c-783269680d6d', '9ebaf26f-2380-4ade-8ae7-e8e67e575444', 'Gaseosa Línea Coca 500ml', NULL, 4200, NULL, true, 'menu', NULL, false, 0, -8, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('9d729e46-04a1-4c6a-8b1f-00625184236c', '9107d565-bf72-45cf-bd03-b814484feb0b', 'Helado', NULL, 5500, '/images/products/helado.jpeg', true, 'menu', NULL, false, 0, -24, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('2835c21f-9073-4373-932f-6cfbe01010db', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Filet empanado con guarnición', NULL, 15700, '/images/products/filet-empanado-guarnicion.jpeg', true, 'menu', NULL, false, 0, -37, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('dde56668-6b15-478e-9ef6-a57857ad0508', '77d9e712-1db6-439e-bdcf-f3c7574e9ffe', '1/2 Docena Empanadas', NULL, 10900, NULL, true, 'menu', NULL, false, 0, -8, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('60d87814-12cc-445e-99b6-8d7b79ed796b', '13721c38-96b5-46ec-a28b-5ce995199ab4', 'Sándwich de Milanesa', NULL, 10500, NULL, true, 'menu', NULL, false, 0, -5, '[{"name":"Tipo","values":["Vacuna","Pollo"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('06108f10-1347-451e-8374-f22513011707', '77d9e712-1db6-439e-bdcf-f3c7574e9ffe', 'Docena Empanadas', NULL, 20000, NULL, true, 'menu', NULL, false, 0, -3, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('8fb0ee9e-3cb6-4be4-bcf9-9d7015fe9433', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Pechuga Grillé c/ Guarnición', NULL, 14500, '/images/products/pechuga-grille-guarnicion.jpeg', true, 'menu', NULL, false, 0, -55, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('45c15386-08fb-45bc-9de2-bcc76a29a531', '9ebaf26f-2380-4ade-8ae7-e8e67e575444', 'Agua con o sin gas Ivess', NULL, 3200, NULL, true, 'menu', NULL, false, 0, -178, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('f05bb4f7-3dcc-4be3-9802-fc18681aa294', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Bife de Costilla c/ Guarnición', NULL, 16900, '/images/products/bife-costilla-papas-fritas.jpeg', true, 'menu', NULL, false, 0, -70, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('91399d30-22f0-491c-b675-17f79345b769', '13721c38-96b5-46ec-a28b-5ce995199ab4', 'Tostado de Pan Árabe', NULL, 7000, NULL, true, 'menu', NULL, false, 0, -414, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('11cf4049-80c1-4275-ae7a-832f5a5c9538', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Albóndigas con Puré', NULL, 14500, NULL, true, 'menu', NULL, false, 0, -113, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('71c066c0-4d56-46e0-9ff6-982094cee006', '77d9e712-1db6-439e-bdcf-f3c7574e9ffe', 'Empanada (Unidad)', NULL, 2000, NULL, true, 'menu', NULL, false, 0, -151, '[{"name":"Gusto","values":["Carne","Pollo","Jamón y Queso","Choclo"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('dbbc48c0-8c77-4976-91cd-857ffc8e895d', '8f94bd65-8f3b-4638-ab1e-2d2a87f82fa7', 'Milanesa Completa', NULL, 16000, NULL, true, 'menu', NULL, false, 0, -8, '[{"name":"Tipo","values":["Vacuna","Pollo"]},{"name":"Guarnición","values":["Papas Fritas","Ensalada","Puré"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('56fbd4fc-6b58-4d41-b366-de5c54436669', '9107d565-bf72-45cf-bd03-b814484feb0b', 'Budín de Pan', NULL, 4500, '/images/products/budin-pan.jpeg', true, 'menu', NULL, false, 0, -21, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c337367b-b043-408a-9294-55f197f735c5', '9ebaf26f-2380-4ade-8ae7-e8e67e575444', 'Agua Saborizada Aquarius 500ml', NULL, 4200, NULL, true, 'menu', NULL, false, 0, -108, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('fe147dbb-df60-47b6-a74e-291865d4e04e', '13721c38-96b5-46ec-a28b-5ce995199ab4', 'Sándwich Milanesa Completo c/ Fritas', NULL, 16500, NULL, true, 'menu', NULL, false, 0, -17, '[{"name":"Tipo","values":["Vacuna","Pollo"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('cd7219d9-3f23-4dce-8abe-3a7b99e9ba1b', '8f94bd65-8f3b-4638-ab1e-2d2a87f82fa7', 'Milanesa Napolitana Especial', NULL, 17900, '/images/products/milanesa-napolitana-especial.jpeg', true, 'menu', NULL, false, 0, -16, '[{"name":"Tipo","values":["Vacuna","Pollo"]},{"name":"Guarnición","values":["Papas Fritas","Ensalada","Puré"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('8be2ddf1-8dfd-4f6f-9c49-8373c3001992', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Arroz con Pollo', NULL, 14500, NULL, true, 'menu', NULL, false, 0, -59, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('b0c04a8a-c597-4ccf-8cce-afb73f05dd60', '9107d565-bf72-45cf-bd03-b814484feb0b', 'Flan Casero', NULL, 4500, '/images/products/flan-casero.jpeg', true, 'menu', NULL, false, 0, -106, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('e3293340-e263-4df3-a309-07680755cc98', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Chocolatada', NULL, 5500, '/images/products/chocolatada.jpeg', true, 'menu', NULL, false, 0, -27, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('1e41f70e-3b3b-4e49-853f-532dfbade0e4', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Clásico', 'Infusión + 3 medialunas + 1/2 exprimido', 12800, NULL, true, 'menu', NULL, false, 0, -17, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('ea02250c-b593-45ab-a7c4-6989473ae578', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Tostadas c/ Huevo y Palta (2 un)', NULL, 9100, '/images/products/tostadas-huevo-y-palta.jpeg', true, 'menu', NULL, false, 0, -98, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('ec826717-8abc-4f4d-b776-559570a918d4', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Factura (Unidad)', NULL, 1300, '/images/products/factura-unidad.jpeg', true, 'menu', NULL, false, 0, -738, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('85fe3da8-42ab-4f26-9b07-e47661e3a24b', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Café Doble / Cortado Doble', NULL, 5300, '/images/products/cafe-doble-cortado-doble.jpeg', true, 'menu', NULL, false, 0, -180, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('2c1358d0-d218-4d52-a1c6-3242efcf2d3d', 'b0825cf2-12f8-47dc-a561-56ef66508a13', 'Ravioles de Calabaza y Ricota', NULL, 12000, NULL, true, 'menu', NULL, false, 0, -13, '[{"name":"Salsa","values":["Bolognesa","Filetto","Blanca","Mixta"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('f8efcbb5-1e44-4c74-9183-bed4b05d6172', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Submarino', NULL, 7300, '/images/products/submarino.jpeg', true, 'menu', NULL, false, 0, -67, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('bd9c3455-f1c3-4d0d-95c0-0ed03565820a', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Capuccino', NULL, 7300, '/images/products/capuccino.jpeg', true, 'menu', NULL, false, 0, -29, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('56d36060-01db-4904-9eb5-fc9d193bbbf8', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Lemon Pie', NULL, 9200, '/images/products/lemon-pie.jpeg', true, 'menu', NULL, false, 0, -2, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('055bf464-aa52-40c2-a8e0-edf6824cbbe4', '8f94bd65-8f3b-4638-ab1e-2d2a87f82fa7', 'Milanesa Sola', NULL, 13200, NULL, true, 'menu', NULL, false, 0, -54, '[{"name":"Tipo","values":["Vacuna","Pollo"]},{"name":"Guarnición","values":["Papas Fritas","Ensalada","Puré"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('64354cfd-9182-4d5f-8e6b-19c5e923bf12', '49718b11-0270-4ab9-82f6-4a3f209bebe9', 'Café c/ Leche + 2 Facturas', NULL, 7000, '/images/products/cafe-leche-dos-facturas.jpeg', true, 'menu', NULL, false, 0, -548, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('803630f3-b2f3-4f19-b2ed-bafd5741646a', '49718b11-0270-4ab9-82f6-4a3f209bebe9', 'Jarrito + 2 Facturas', NULL, 5500, '/images/products/jarrito-dos-facturas.jpeg', true, 'menu', NULL, false, 0, -268, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('327bfe52-50ca-44ef-9e64-b4b70539c70f', '309e88a1-5663-4e50-8a9e-f9f48c4d55a1', 'Tortilla Bloom (JyQ)', NULL, 10500, '/images/products/tortilla-bloom.jpeg', true, 'menu', NULL, false, 0, -22, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('873c8421-3d9d-475b-ba56-8fb62bf97227', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Café Jarrito', NULL, 3900, '/images/products/cafe-jarrito.jpeg', true, 'menu', NULL, false, 0, -1659, '[{"name":"Variedad","values":["Café","Cortado","Lágrima"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('e304ea99-a146-4a9d-8336-d866eef3e1b8', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Café c/ Leche - Lágrima Doble', NULL, 5100, '/images/products/cafe-lagrima-doble.jpeg', true, 'menu', NULL, false, 0, -534, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('df1df0c8-85cf-4105-be11-1eb83f3ad1f2', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Café Pocillo', NULL, 3000, '/images/products/cafe-pocillo.jpeg', true, 'menu', NULL, false, 0, -931, '[{"name":"Variedad","values":["Espresso","Cortado","Ristretto"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('941a2a60-ab85-4ddb-8400-25017665f115', '1902ae8a-f589-4589-b25e-405d6af5d559', 'Zanahoria y Huevo', NULL, 7000, '/images/products/ensalada-zanahoria-y-huevo.jpeg', true, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('e824a705-ec5c-4c47-8074-1d4fdce9a579', '9211e165-5b1d-4762-a65d-e16220d35bd7', 'Café con Crema (Jarrito)', NULL, 5100, '/images/products/cafe-crema-jarrito.jpeg', true, 'menu', NULL, false, 0, -32, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('30497972-2dfb-408c-b0d2-1bd1dd2a93d7', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Alfajor Sin TACC', NULL, 4800, '/images/products/alfajor-sin-tacc.jpeg', true, 'menu', NULL, false, 0, -23, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('f597cfc2-a356-4f5a-8006-6a0ac9475073', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Continental', 'Infusión + 2 medialunas + 1/2 tostado + 1/2 exprimido', 14500, NULL, true, 'menu', NULL, false, 0, -11, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c096e139-237e-4df9-9d1e-708ab22bc6a9', 'b0825cf2-12f8-47dc-a561-56ef66508a13', 'Ñoquis de Papa', NULL, 12000, NULL, true, 'menu', NULL, false, 0, -14, '[{"name":"Salsa","values":["Bolognesa","Filetto","Blanca","Mixta"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('3c17048e-3b8e-4677-8d11-0f00680547d4', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Alfajor Deguido', NULL, 4300, '/images/products/alfajor-deguido.jpeg', true, 'menu', NULL, false, 0, -35, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('23db6a94-03d3-4281-89dd-9588158e0e84', 'b0825cf2-12f8-47dc-a561-56ef66508a13', 'Canelones de Verdura y Ricota', NULL, 13900, NULL, true, 'menu', NULL, false, 0, -10, '[{"name":"Salsa","values":["Bolognesa","Filetto","Blanca","Mixta"]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('f5da144c-a0b9-4240-90c8-ef60b176bebc', 'b2fa234e-3931-4536-8432-dc7960c86ca0', 'Limonada', NULL, 8000, '/images/products/limonada.jpeg', true, 'menu', NULL, false, 0, -23, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('ca87fc85-41dc-43f3-9394-7a3d026435c6', '2a86814a-4b4f-4101-82c4-aa7e65848730', '1/2 Porción Tostadas (1 un)', NULL, 2700, '/images/products/tostada-media-porcion.jpeg', true, 'menu', NULL, false, 0, -49, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('5c5f9579-2eff-4025-9f1e-dbea8dfc4a19', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Tarta de Coco', NULL, 9200, '/images/products/tarta-de-coco.jpeg', true, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('1e68f34e-1f1d-4560-ae9f-e2fc7e961034', '1902ae8a-f589-4589-b25e-405d6af5d559', 'Caesar', NULL, 9100, '/images/products/ensalada-caesar.jpeg', true, 'menu', NULL, false, 0, -25, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('090e3d84-d7ac-491b-bea1-6daf54656142', '747e3b05-aee8-4c35-a685-9f1e9a8a5514', 'Hamburguesa Sola', NULL, 13200, NULL, true, 'menu', NULL, false, 0, -50, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('1e177037-83d0-49f5-a469-18c476553173', 'f24aeb5d-42a8-4a09-86e6-83f6c499295c', 'Pizza Especial', NULL, 14500, NULL, true, 'menu', NULL, false, 0, -2, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('fe1bad5d-d902-488a-a366-c003cefd4348', '1902ae8a-f589-4589-b25e-405d6af5d559', 'Rúcula y Parmesano', NULL, 8000, '/images/products/ensalada-rucula-parmesano.jpeg', true, 'menu', NULL, false, 0, -2, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('4b4ad623-b992-4104-8f07-a1878ad23d0a', '1902ae8a-f589-4589-b25e-405d6af5d559', 'Zanahoria, Huevo, Choclo y Lentejas', NULL, 7600, NULL, true, 'menu', NULL, false, 0, -2, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('324f4358-effe-4bc8-8aac-d510599c1cbf', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Cookie', NULL, 6000, '/images/products/cookie.jpeg', true, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('11257253-487b-427d-afea-e38d29b2ae3e', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Alfajor de Maicena', NULL, 4300, NULL, true, 'menu', NULL, false, 0, -3, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('67e9fba2-2644-497f-a0f5-bd3edc99ef51', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'Brownie c/ Merengue', NULL, 9200, '/images/products/brownie-merengue.jpeg', true, 'menu', NULL, false, 0, -1, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('edfe0f54-1045-4dfc-a23a-5ad5e9216bec', '1902ae8a-f589-4589-b25e-405d6af5d559', 'Ensalada Criolla', NULL, 7600, '/images/products/ensalada-criolla.jpeg', true, 'menu', NULL, false, 0, -6, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('88d81a64-2b85-46b9-82ff-1a5badd43a9e', '2a86814a-4b4f-4101-82c4-aa7e65848730', 'Saludable', 'Infusión + 2 tostadas pan de campo c/ queso + 1/2 exprimido', 13800, NULL, true, 'menu', NULL, false, 0, -12, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('a3325fa6-6bb5-442e-9b6e-567ec1cc6886', 'b2fa234e-3931-4536-8432-dc7960c86ca0', 'Naranjada', NULL, 8000, NULL, true, 'menu', NULL, false, 0, -16, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('dfe214f1-9d2c-4164-a17d-77a635c9f3e4', 'f24aeb5d-42a8-4a09-86e6-83f6c499295c', 'Pizza Muzzarella', NULL, 13200, NULL, true, 'menu', NULL, false, 0, -12, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('0330fad8-2920-46af-9823-8ec84c400767', '1902ae8a-f589-4589-b25e-405d6af5d559', 'Ensalada Bloom', NULL, 10500, '/images/products/ensalada-bloom.jpeg', true, 'menu', NULL, false, 0, -20, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('aabb737e-467b-40f8-aeca-bc50605ac383', 'b2fa234e-3931-4536-8432-dc7960c86ca0', 'Medio Exprimido', NULL, 4800, NULL, true, 'menu', NULL, false, 0, -24, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('786b196c-f920-411e-aa76-181991eb9d27', '1902ae8a-f589-4589-b25e-405d6af5d559', 'Ensalada Liviana', NULL, 10500, '/images/products/ensalada-liviana.jpeg', true, 'menu', NULL, false, 0, -12, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('e19dcaea-845e-4851-87fc-9325e04616c2', '5f519a10-4aef-4076-87cc-556387f3720b', 'Tarta Jamón y Queso', NULL, 6500, NULL, true, 'menu', NULL, false, 0, -31, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c26656fd-78c8-4406-b92f-df5b91328aec', '5f519a10-4aef-4076-87cc-556387f3720b', 'Tarta Zapallito', NULL, 6500, NULL, true, 'menu', NULL, false, 0, -28, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('467d7b9a-8794-459a-8c4c-1bd29c5aa24d', '5f519a10-4aef-4076-87cc-556387f3720b', 'Tarta Pollo y Mostaza', NULL, 6500, NULL, true, 'menu', NULL, false, 0, -18, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c7a491b5-8470-4c51-a810-1bfbfccc60a5', '5f519a10-4aef-4076-87cc-556387f3720b', 'Tarta Brócoli y Jamón', NULL, 6500, NULL, true, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('cf55e3a8-eb00-45d9-b81b-156efb29af39', '5f519a10-4aef-4076-87cc-556387f3720b', 'Tarta Tricolor', NULL, 6500, NULL, true, 'menu', NULL, false, 0, -31, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('a82f567a-ae18-4f58-9e02-dafae9e298f9', '5f519a10-4aef-4076-87cc-556387f3720b', 'Tarta Pollo', NULL, 6500, NULL, true, 'menu', NULL, false, 0, -13, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('b08ab647-bf8e-4aee-a3bd-6cb68c79e6ac', '5f519a10-4aef-4076-87cc-556387f3720b', 'Tarta Pascualina', NULL, 6500, NULL, true, 'menu', NULL, false, 0, -25, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('af307a01-d05b-43f9-9408-1523962ed191', '13721c38-96b5-46ec-a28b-5ce995199ab4', 'Pebete', NULL, 6000, '/images/products/pebete-jamon-y-queso.jpeg', true, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('56fa8135-b9a7-4a7d-b6c2-0fe716e3e3ae', '13721c38-96b5-46ec-a28b-5ce995199ab4', 'Sacramento', NULL, 6000, '/images/products/sacramento-jamon-y-queso.jpeg', true, 'menu', NULL, false, 0, -2, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c81a62a4-639e-4479-84cb-04a8ad5aca8d', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Café Delivery +1', NULL, 4200, NULL, true, 'menu', NULL, false, 0, -777, '{"groups":[{"max":1,"min":1,"name":"Presentación","options":["Jarrito","Pocillo"]},{"max":1,"min":1,"name":"Variedad","options":["Café","Negro","Apenas cortado","Cortado o lágrima","Deslactosado","Leche de almendras"]}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('6f2ab383-9a19-40b6-9507-d631006d3904', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Café Delivery +2', NULL, 4600, NULL, true, 'menu', NULL, false, 0, -345, '{"groups":[{"max":1,"min":1,"name":"Presentación","options":["Jarrito","Pocillo"]},{"max":1,"min":1,"name":"Variedad","options":["Café","Negro","Apenas cortado","Cortado o lágrima","Deslactosado","Leche de almendras"]}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('4080f544-066c-4420-97b1-bb4489664ce3', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Café Delivery', NULL, 3500, NULL, true, 'menu', NULL, false, 0, -1203, '{"groups":[{"max":1,"min":1,"name":"Presentación","options":["Jarrito","Pocillo"]},{"max":1,"min":1,"name":"Variedad","options":["Café","Negro","Apenas cortado","Cortado o lágrima","Deslactosado","Leche de almendras"]}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('fae4b0a0-1a53-4568-a05f-8c896699c9b4', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Mate Cocido Delivery', NULL, 3500, '/images/products/mate-cocido-delivery.jpeg', true, 'menu', NULL, false, 0, -6, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('74a65c3d-4804-403c-9c4e-db6aee10b8c9', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Café Delivery Grande', NULL, 5000, '/images/products/cafe-delivery-vaso.jpeg', true, 'menu', NULL, false, 0, -87, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('11f32559-2dd3-46ce-a3fc-8da8216d3fea', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Capuchino Delivery', NULL, 6500, '/images/products/capuchino-delivery-sin-crema.jpeg', true, 'menu', NULL, false, 0, -7, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('3334a94e-8867-4b92-93c9-ae6ce0a767fb', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Café Delivery Grande +1', NULL, 5900, '/images/products/cafe-delivery-una-medialuna.jpeg', true, 'menu', NULL, false, 0, -52, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c657cca9-e769-4da4-bc9d-a19ac5d02064', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Té Delivery', NULL, 3500, '/images/products/te-delivery.jpeg', true, 'menu', NULL, false, 0, -7, '{"groups":[{"max":1,"min":1,"name":"Sabor","options":["Hierbas digestivas","Manzanilla","Limón","Frutilla","Boldo","Manzana-Canela","Tilo y Verde","Cedrón"]}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('58227210-100c-4bca-8600-03a6d3fced68', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Café Delivery Grande +2', NULL, 6500, '/images/products/cafe-delivery-dos-medialunas.jpeg', true, 'menu', NULL, false, 0, -40, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('d2442779-ccd7-4eaf-8f04-f6f04922df43', '155d6b39-7e1d-412f-b984-85fc2f6251f9', 'Té Saborizado Delivery', NULL, 3500, '/images/products/te-saborizado-delivery.jpeg', true, 'menu', NULL, false, 0, -16, '{"groups":[{"max":1,"min":1,"name":"Sabor","options":["Hierbas digestivas","Manzanilla","Limón","Frutilla","Boldo","Manzana-Canela","Tilo y Verde","Cedrón"]}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('19b78043-2184-45a4-91f2-bdc16f42ee10', '13721c38-96b5-46ec-a28b-5ce995199ab4', 'Arabe Pollo  3 INGREDIENTES', '', 15500, NULL, true, 'menu', NULL, false, 0, -51, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('02c5e8e1-6be0-4a4b-8d48-9a9bcbf07b95', 'caab85e0-7026-4f4a-95e8-01d98febdcd5', 'BARRITA DE CEREAL ', 'BARRITA DE CEREAL', 3100, '/images/products/barrita-cereal.jpeg', true, 'menu', NULL, false, 0, -8, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('071b683f-18db-488b-88a0-01037f7aca04', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Bifes de cerdo c/ calabaza', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('0d2faf2f-7223-44c4-ab94-2268ccd174a3', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Matambrito de cerdo', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('cc926c90-49cd-48d7-9cb3-7f3713dd71f4', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Bifes a la criolla', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('213dab1b-4cdb-4a1c-8126-533b8fdf4dd9', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Matambre a la pizza', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('43b1d90c-386b-4b38-b6e8-1c512b4b5c56', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Canelones', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('f51fa815-90bc-4443-9fe3-1e28f6ba7ac3', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Yakimeshi', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('370d09a7-84a0-4e7b-84fd-278706ac5b09', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Sándwich de carne braseada', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('aee2bf4d-999c-4a4f-89da-33c444e10f96', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Hamburguesas de pollo', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('3fb9d875-4bc8-4103-9c40-6883566f2f01', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Zapallitos rellenos', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('7724a8ee-c35e-4bb5-9e9a-6d3075224293', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Ñoquis con estofado', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('e56d8c3b-96cc-4167-90ef-17fb444cb5a9', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Choripán con fritas', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('28131229-c6de-489e-a1dd-5d5a1bc0e41d', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Medallón de pollo a la napolitana', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('ed30526b-157d-4be2-9feb-256af3a7ef95', 'a3ea6438-3334-4460-b2c4-ab4d888007c8', 'Yakisoba', 'Opción para seleccionar como Plato del Día.', 0, '/images/categories/platos-diarios-bloom.jpeg', false, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('42e13345-2193-4d52-8f65-d3357fca1399', '49718b11-0270-4ab9-82f6-4a3f209bebe9', 'Menu Tribunales', '', 11500, NULL, true, 'menu', NULL, false, 0, -114, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('87b601c9-5895-4d8a-92f9-fac4ab518c5b', '4d9e90d5-48f9-4401-b431-a44c5da92cdc', 'Menu del Dia', '', 15500, NULL, true, 'menu', NULL, false, 0, -243, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('273b46b3-a0fa-466f-9b8e-474e7d7c5602', '8f94bd65-8f3b-4638-ab1e-2d2a87f82fa7', 'MILANESA NAPOLITANA', '', 16900, NULL, true, 'menu', NULL, false, 0, -3, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('c5234ab2-f4e9-499e-892f-30e3fc44481f', '13721c38-96b5-46ec-a28b-5ce995199ab4', 'ARABE POLLO 2 INGREDIENTES', '', 13500, NULL, true, 'menu', NULL, false, 0, -10, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('605e0a60-23f2-4930-aa5d-521ca8fab0c3', '1902ae8a-f589-4589-b25e-405d6af5d559', 'WRAPS', '', 7500, NULL, true, 'menu', NULL, false, 0, -8, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('e3498956-9c5f-4876-9a9e-491cc47a7570', '9107d565-bf72-45cf-bd03-b814484feb0b', 'GELATINA', '', 4000, NULL, true, 'menu', NULL, false, 0, 0, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;
INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES ('f3465d67-b171-461b-a6ed-887980c34e86', '2cb3f16a-be9c-4e6c-822c-b424a2d4a0ee', '1/2 porcion palta y huevo', '', 4900, NULL, true, 'menu', NULL, false, 0, -1, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;

-- ====================================================================
-- 6. CONFIGURACIÓN DEL LOCAL (APP SETTINGS)
-- ====================================================================
INSERT INTO public.app_settings (id, mesas, barra, whatsapp, site_url, plato_del_dia_id, plato_dia_price)
VALUES (1, 40, 3, '54 9 223 123-4567', 'https://bloommdp.com', '109657d5-8bf2-4bfe-adff-902b323f7112', 15900)
ON CONFLICT (id) DO UPDATE SET mesas = EXCLUDED.mesas, barra = EXCLUDED.barra, whatsapp = EXCLUDED.whatsapp, site_url = EXCLUDED.site_url, plato_del_dia_id = EXCLUDED.plato_del_dia_id, plato_dia_price = EXCLUDED.plato_dia_price;

-- ====================================================================
-- 7. INICIALIZAR MESAS DEL SALÓN (1 a 40)
-- ====================================================================
INSERT INTO public.salon_tables (id, status, total)
SELECT generate_series(1, 40), 'FREE', 0
ON CONFLICT (id) DO NOTHING;

-- ¡LISTO! BASE DE DATOS INICIALIZADA CON TODO EL CATÁLOGO Y SIN HISTORIAL VIEJO.
