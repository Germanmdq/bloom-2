import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://elvifblvjvcbwabhrlco.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number' || typeof str === 'boolean') return String(str);
  if (typeof str === 'object') return `'${JSON.stringify(str).replace(/'/g, "''")}'::jsonb`;
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function exportCleanDatabase() {
  console.log('--- EXPORTANDO BASE DE DATOS LIMPIA (SIN HISTORIAL) ---');

  // 1. Obtener Categorías
  const { data: categories, error: errCats } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false });

  if (errCats) throw new Error('Error categories: ' + errCats.message);
  console.log(`✓ Categorías obtenidas: ${categories.length}`);

  // 2. Obtener Productos
  const { data: products, error: errProds } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (errProds) throw new Error('Error products: ' + errProds.message);
  console.log(`✓ Productos obtenidos: ${products.length}`);

  // 3. Obtener App Settings
  const { data: appSettings, error: errSettings } = await supabase
    .from('app_settings')
    .select('*');

  if (errSettings) console.warn('Warning app_settings:', errSettings.message);
  console.log(`✓ App Settings obtenidas: ${appSettings?.length || 0}`);

  // Guardar backup JSON
  const jsonPath = path.resolve('scripts', 'clean-seed-data.json');
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ categories, products, appSettings }, null, 2),
    'utf-8'
  );
  console.log(`✓ Archivo JSON exportado a: ${jsonPath}`);

  // 4. Generar archivo SQL completo para el nuevo proyecto
  let sql = `-- ====================================================================
-- BLOOM CAFÉ & POS - SCRIPT DE INICIALIZACIÓN PARA NUEVO PROYECTO SUPABASE
-- Contiene: Esquema completo + 20 Categorías + 127 Productos + Configuración
-- Excluye: Historial de órdenes antiguas y comandas de prueba (Base limpia)
-- Fecha de generación: ${new Date().toISOString()}
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

-- Perfiles de Usuarios / Staff
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.user_role DEFAULT 'WAITER'::public.user_role NOT NULL,
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
    customer_name TEXT,
    customer_phone TEXT,
    order_type TEXT DEFAULT 'WEB',
    delivery_type TEXT,
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    paid BOOLEAN DEFAULT false,
    stock_applied BOOLEAN DEFAULT true,
    stock_deducted BOOLEAN DEFAULT true,
    payment_method TEXT DEFAULT 'PENDING',
    payment_notes TEXT,
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
-- 4. INSERTAR CATEGORÍAS (${categories.length})
-- ====================================================================
`;

  // Insert categorías
  for (const c of categories) {
    sql += `INSERT INTO public.categories (id, name, icon, sort_order, sales_count, image_url)
VALUES (${escapeSql(c.id)}, ${escapeSql(c.name)}, ${escapeSql(c.icon)}, ${escapeSql(c.sort_order)}, ${escapeSql(c.sales_count || 0)}, ${escapeSql(c.image_url)})
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, image_url = EXCLUDED.image_url;\n`;
  }

  sql += `\n-- ====================================================================
-- 5. INSERTAR PRODUCTOS (${products.length})
-- ====================================================================
`;

  // Insert productos
  for (const p of products) {
    sql += `INSERT INTO public.products (id, category_id, name, description, price, image_url, active, kind, unit, track_stock, min_stock, stock, options)
VALUES (${escapeSql(p.id)}, ${escapeSql(p.category_id)}, ${escapeSql(p.name)}, ${escapeSql(p.description)}, ${escapeSql(p.price)}, ${escapeSql(p.image_url)}, ${escapeSql(p.active)}, ${escapeSql(p.kind)}, ${escapeSql(p.unit)}, ${escapeSql(p.track_stock)}, ${escapeSql(p.min_stock || 0)}, ${escapeSql(p.stock || 0)}, ${escapeSql(p.options)})
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_url = EXCLUDED.image_url, active = EXCLUDED.active, stock = EXCLUDED.stock, options = EXCLUDED.options;\n`;
  }

  sql += `\n-- ====================================================================
-- 6. CONFIGURACIÓN DEL LOCAL (APP SETTINGS)
-- ====================================================================
`;

  if (appSettings && appSettings.length > 0) {
    const s = appSettings[0];
    sql += `INSERT INTO public.app_settings (id, mesas, barra, whatsapp, site_url, plato_del_dia_id, plato_dia_price)
VALUES (${escapeSql(s.id)}, ${escapeSql(s.mesas)}, ${escapeSql(s.barra)}, ${escapeSql(s.whatsapp)}, ${escapeSql(s.site_url)}, ${escapeSql(s.plato_del_dia_id)}, ${escapeSql(s.plato_dia_price)})
ON CONFLICT (id) DO UPDATE SET mesas = EXCLUDED.mesas, barra = EXCLUDED.barra, whatsapp = EXCLUDED.whatsapp, site_url = EXCLUDED.site_url, plato_del_dia_id = EXCLUDED.plato_del_dia_id, plato_dia_price = EXCLUDED.plato_dia_price;\n`;
  }

  sql += `\n-- ====================================================================
-- 7. INICIALIZAR MESAS DEL SALÓN (1 a 40)
-- ====================================================================
INSERT INTO public.salon_tables (id, status, total)
SELECT generate_series(1, 40), 'FREE', 0
ON CONFLICT (id) DO NOTHING;

-- ¡LISTO! BASE DE DATOS INICIALIZADA CON TODO EL CATÁLOGO Y SIN HISTORIAL VIEJO.
`;

  const sqlPath = path.resolve('supabase', 'clean_new_project_export.sql');
  fs.writeFileSync(sqlPath, sql, 'utf-8');
  console.log(`✓ Archivo SQL generado con éxito en: ${sqlPath}`);
  console.log(`✓ Tamaño: ${(sql.length / 1024).toFixed(1)} KB`);
}

exportCleanDatabase().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
