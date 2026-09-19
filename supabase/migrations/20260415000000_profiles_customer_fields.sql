-- Agregar campos de cliente a la tabla profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS birthdate DATE,
  ADD COLUMN IF NOT EXISTS default_address TEXT;

-- Actualizar el trigger para guardar todos los datos del registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_is_customer BOOLEAN;
BEGIN
  v_is_customer := COALESCE((NEW.raw_user_meta_data->>'is_customer')::boolean, false);

  INSERT INTO public.profiles (id, full_name, role, is_customer, phone, birthdate, default_address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', CASE WHEN v_is_customer THEN 'Cliente Bloom' ELSE 'Nuevo Empleado' END),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'WAITER'::public.user_role),
    v_is_customer,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'birthdate' IS NOT NULL
       AND NEW.raw_user_meta_data->>'birthdate' != ''
      THEN (NEW.raw_user_meta_data->>'birthdate')::DATE
      ELSE NULL
    END,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'default_address', '')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name        = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role             = COALESCE(EXCLUDED.role, public.profiles.role),
    is_customer      = COALESCE(EXCLUDED.is_customer, public.profiles.is_customer),
    phone            = COALESCE(EXCLUDED.phone, public.profiles.phone),
    birthdate        = COALESCE(EXCLUDED.birthdate, public.profiles.birthdate),
    default_address  = COALESCE(EXCLUDED.default_address, public.profiles.default_address);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
