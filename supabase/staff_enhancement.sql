-- 1. AGREGAR COLUMNA DE EMAIL A PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. FUNCIÓN DE DISPARADOR ACTUALIZADA PARA SINCRONIZAR EMAIL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nuevo Empleado'), 
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'WAITER'::public.user_role)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. MIGRACIÓN: RELLENAR EMAILS DE USUARIOS EXISTENTES
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;
