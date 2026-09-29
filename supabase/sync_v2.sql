-- 1. ASEGURAR QUE EXISTE EL TIPO DE ROL
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WAITER', 'KITCHEN', 'MANAGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ASEGURAR QUE EXISTE LA TABLA DE PERFILES CON RLS CORRECTO
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.user_role DEFAULT 'WAITER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FORZAR SINCRONIZACIÓN DE TODOS LOS USUARIOS EXISTENTES EN AUTH
-- Esto "rescata" a los empleados que creaste y no aparecen.
INSERT INTO public.profiles (id, full_name, role)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'Empleado Bloom'),
    COALESCE((raw_user_meta_data->>'role')::public.user_role, 'WAITER'::public.user_role)
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 4. AGREGAR COLUMNA 'waiter_id' A LAS ÓRDENES PARA ASIGNAR MESAS
-- Esto permite saber qué mesero atendió cada pedido.
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.profiles(id);

-- 5. SEGURIDAD (RLS) PARA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all authenticated users" ON public.profiles;
CREATE POLICY "Enable read for all authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow individual update" ON public.profiles;
CREATE POLICY "Allow individual update" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 6. DISPARADOR AUTOMÁTICO (TRIGGER) ROBUSTO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nuevo Empleado'), 
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'WAITER'::public.user_role)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
