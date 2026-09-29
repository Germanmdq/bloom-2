-- 1. ASEGURAR QUE EXISTE EL TIPO DE ROL
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WAITER', 'KITCHEN', 'MANAGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ASEGURAR QUE EXISTE LA TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.user_role DEFAULT 'WAITER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ACTUALIZAR FUNCIÓN DE DISPARADOR (TRIGGER)
-- Esta función se encarga de que cada vez que creas un usuario en Auth, se cree su perfil automáticamente.
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

-- Re-aplicar el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. SINCRONIZACIÓN MANUAL (Por si ya creaste usuarios y no tienen perfil)
-- Este bloque inserta en 'profiles' a todos los que ya estén en 'auth.users' pero no tengan perfil.
INSERT INTO public.profiles (id, full_name, role)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'Empleado Antiguo'),
    COALESCE((raw_user_meta_data->>'role')::public.user_role, 'WAITER'::public.user_role)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. SEGURIDAD Y VISIBILIDAD
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles 
FOR SELECT TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = id);
