-- ============================================================
-- BLOOM - SETUP COMPLETO DE BASE DE DATOS
-- Correr este script en Supabase SQL Editor
-- Idempotente: se puede correr múltiples veces sin problema
-- ============================================================

-- 1. ENUMS
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WAITER', 'KITCHEN', 'MANAGER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.table_status AS ENUM ('FREE', 'OCCUPIED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('CASH', 'CARD', 'MERCADO_PAGO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLAS

-- Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.user_role DEFAULT 'WAITER' NOT NULL,
    email TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mesas del salón
CREATE TABLE IF NOT EXISTS public.salon_tables (
    id INTEGER PRIMARY KEY,
    status public.table_status DEFAULT 'FREE',
    total DECIMAL(10,2) DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    order_type TEXT DEFAULT 'LOCAL',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Agregar columnas si ya existe la tabla sin ellas
ALTER TABLE public.salon_tables ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.salon_tables ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'LOCAL';

-- Categorías
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Productos
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    track_stock BOOLEAN DEFAULT false,
    unit TEXT DEFAULT 'unidad',
    min_stock DECIMAL(10,2) DEFAULT 0,
    kind TEXT DEFAULT 'FINISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unidad';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'FINISHED';

-- Órdenes
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id INTEGER NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    waiter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'COMPLETED',
    stock_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'COMPLETED';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_applied BOOLEAN DEFAULT false;

-- Tickets de cocina
CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimientos de inventario
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    qty DECIMAL(10,3) NOT NULL,
    reason TEXT NOT NULL,
    note TEXT,
    ref_table TEXT,
    ref_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recetas
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    raw_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    qty DECIMAL(10,3) NOT NULL DEFAULT 1
);

-- Gastos
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT DEFAULT 'general',
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuración de la app
CREATE TABLE IF NOT EXISTS public.app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    mesas JSONB DEFAULT '{}'::jsonb,
    barra JSONB DEFAULT '{}'::jsonb,
    whatsapp JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Pedidos WhatsApp
CREATE TABLE IF NOT EXISTS public.pedidos_whatsapp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_cliente TEXT,
    numero_cliente TEXT,
    estado TEXT DEFAULT 'PENDIENTE',
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. VISTA DE STOCK
CREATE OR REPLACE VIEW public.v_stock AS
SELECT
    p.id,
    p.name,
    p.unit,
    p.min_stock,
    COALESCE(SUM(m.qty), 0) AS stock
FROM public.products p
LEFT JOIN public.inventory_movements m ON m.raw_product_id = p.id
WHERE p.kind = 'RAW' OR p.track_stock = true
GROUP BY p.id, p.name, p.unit, p.min_stock;

-- 4. SEED DE MESAS (36 mesas locales)
INSERT INTO public.salon_tables (id, status, total, items, order_type)
SELECT i, 'FREE', 0, '[]'::jsonb, 'LOCAL'
FROM generate_series(1, 36) AS i
ON CONFLICT (id) DO NOTHING;

-- 5. RLS - HABILITAR Y CREAR POLICIES PERMISIVAS (acceso anon + authenticated)

ALTER TABLE public.salon_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_whatsapp ENABLE ROW LEVEL SECURITY;

-- Eliminar policies viejas y recrear
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "public_all_salon_tables" ON public.salon_tables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_kitchen_tickets" ON public.kitchen_tickets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_inventory_movements" ON public.inventory_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_recipes" ON public.recipes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_expenses" ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_app_settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all_pedidos_whatsapp" ON public.pedidos_whatsapp FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
