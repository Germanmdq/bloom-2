-- ==========================================
-- 1. TIPOS Y ENUMS
-- ==========================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WAITER', 'KITCHEN', 'MANAGER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.table_status AS ENUM ('FREE', 'OCCUPIED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('CASH', 'CARD', 'MERCADO_PAGO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==========================================
-- 2. TABLAS PRINCIPALES
-- ==========================================

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.user_role DEFAULT 'WAITER'::public.user_role NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mesas del Salón
CREATE TABLE IF NOT EXISTS public.salon_tables (
    id INTEGER PRIMARY KEY,
    status public.table_status DEFAULT 'FREE',
    total DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías de Productos
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos del Menú
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Órdenes / Ventas
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id INTEGER NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    waiter_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ==========================================
-- 3. SEGURIDAD (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de Mesas
DROP POLICY IF EXISTS "Public read tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Update tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Full access tables" ON public.salon_tables;
CREATE POLICY "Full access tables" ON public.salon_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Categorías
DROP POLICY IF EXISTS "Read categories" ON public.categories;
DROP POLICY IF EXISTS "Full access categories" ON public.categories;
CREATE POLICY "Full access categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Productos
DROP POLICY IF EXISTS "Read products" ON public.products;
DROP POLICY IF EXISTS "Full access products" ON public.products;
CREATE POLICY "Full access products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Órdenes
DROP POLICY IF EXISTS "Authenticated create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated view orders" ON public.orders;
DROP POLICY IF EXISTS "Full access orders" ON public.orders;
CREATE POLICY "Full access orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Perfiles
DROP POLICY IF EXISTS "View own profile" ON public.profiles;
DROP POLICY IF EXISTS "Full access profiles" ON public.profiles;
CREATE POLICY "Full access profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 4. TRIGGERS Y FUNCIONES
-- ==========================================

-- Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'WAITER'::public.user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 5. SEMILLAS (DATA INICIAL CONSOLIDADA)
-- ==========================================

-- Crear 30 mesas iniciales
DO $$
BEGIN
    FOR i IN 1..30 LOOP
        INSERT INTO public.salon_tables (id, status, total)
        VALUES (i, 'FREE', 0)
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- Limpiar productos y categorías
TRUNCATE public.categories CASCADE;
TRUNCATE public.products CASCADE;

-- Insertar Categorías y Productos
DO $$
DECLARE
    cat_cafe UUID;
    cat_panificados UUID;
    cat_promos UUID;
    cat_resto UUID;
    cat_bebidas_postres UUID;
BEGIN
    INSERT INTO public.categories (name) VALUES ('CAFETERÍA Y JUGOS') RETURNING id INTO cat_cafe;
    INSERT INTO public.categories (name) VALUES ('PANIFICADOS Y PASTELERÍA') RETURNING id INTO cat_panificados;
    INSERT INTO public.categories (name) VALUES ('PROMOS Y MERIENDAS') RETURNING id INTO cat_promos;
    INSERT INTO public.categories (name) VALUES ('BLOOM RESTO (COMIDAS)') RETURNING id INTO cat_resto;
    INSERT INTO public.categories (name) VALUES ('BEBIDAS Y POSTRES') RETURNING id INTO cat_bebidas_postres;

    -- CAFETERÍA Y JUGOS
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Café pocillo', 2300, cat_cafe),
    ('Café jarrito', 3000, cat_cafe),
    ('Café con crema', 4100, cat_cafe),
    ('Café c/ leche (doble)', 4100, cat_cafe),
    ('Café doble / Cortado doble', 4300, cat_cafe),
    ('Té / Mate cocido', 2800, cat_cafe),
    ('Té c/ leche / mate cocido c/ leche', 3200, cat_cafe),
    ('Capuccino', 6000, cat_cafe),
    ('Submarino', 6000, cat_cafe),
    ('Chocolatada', 4500, cat_cafe),
    ('Exprimido de naranja', 5900, cat_cafe),
    ('Medio exprimido', 3900, cat_cafe),
    ('Naranjada', 6500, cat_cafe),
    ('Limonada', 6500, cat_cafe),
    ('Licuado (Banana/Frutilla)', 6500, cat_cafe);

    -- PANIFICADOS Y PASTELERÍA
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

    -- PROMOS Y MERIENDAS
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

    -- BLOOM RESTO (COMIDAS)
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

    -- BEBIDAS Y POSTRES
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
