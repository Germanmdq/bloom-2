-- ============================================================================
-- Acceso de clientes por teléfono + RLS correcta
-- NO se ejecuta automáticamente. Revisar y correr a mano en el SQL Editor de Supabase.
-- Es transaccional: si algo falla, no se aplica nada.
--
-- Qué hace:
--  1. is_staff(): una única definición de "personal" (rol operativo Y no cliente).
--  2. handle_new_user(): todo usuario nuevo nace como CLIENTE y con rol por defecto;
--     ya NO toma rol ni is_customer de raw_user_meta_data (que controla quien llama a signUp).
--  3. RLS de profiles, orders y payments_history: cada cliente ve solo lo suyo;
--     el personal ve todo. Reemplaza TODAS las políticas existentes de esas 3 tablas.
--  4. profiles.phone: formato de 10 dígitos obligatorio y único entre clientes.
--
-- Prerrequisito: scripts/auditar-telefonos.mjs debe mostrar 0 duplicados y 0 inválidos
-- (si no, el índice único / el CHECK fallan y no se aplica nada).
-- Después de aplicar: los admins deben tener profiles.role='ADMIN' e is_customer=false.
-- ============================================================================
BEGIN;

-- 1. ¿Es personal? SECURITY DEFINER para evitar recursión de RLS sobre profiles.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_customer = false
      AND p.role IN ('ADMIN', 'WAITER', 'KITCHEN', 'MANAGER')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

-- 2. Alta de usuarios: siempre cliente. El personal se promueve solo con service_role
--    (/api/staff, scripts/crear-admin.mjs), que actualiza role e is_customer a mano.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_customer, phone, birthdate, default_address)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Cliente Bloom'),
    true,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'birthdate', '') ~ '^\d{4}-\d{2}-\d{2}$'
         THEN (NEW.raw_user_meta_data->>'birthdate')::date END,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'default_address', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;  -- nunca pisa un perfil existente (rol, is_customer, saldo)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RLS: se eliminan TODAS las políticas actuales de estas tablas y se crean las correctas.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('profiles', 'orders', 'payments_history')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_history ENABLE ROW LEVEL SECURITY;

-- profiles: el cliente lee SOLO su fila (las ediciones pasan por /api/cuenta, que valida campos);
-- el personal puede todo (el panel escribe saldo, sellos, etc. desde el navegador).
CREATE POLICY profiles_select_own_or_staff ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff());
CREATE POLICY profiles_staff_write ON public.profiles
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- orders: el cliente ve solo sus pedidos; invitados pueden crear pedidos sin cliente (carta pública).
CREATE POLICY orders_select_own_or_staff ON public.orders
  FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff());
CREATE POLICY orders_insert_guest ON public.orders
  FOR INSERT TO anon WITH CHECK (customer_id IS NULL);
CREATE POLICY orders_insert_authenticated ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid() OR public.is_staff());
CREATE POLICY orders_staff_update ON public.orders
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY orders_staff_delete ON public.orders
  FOR DELETE TO authenticated USING (public.is_staff());

-- payments_history: movimientos de cuenta corriente
CREATE POLICY payments_select_own_or_staff ON public.payments_history
  FOR SELECT TO authenticated USING (profile_id = auth.uid() OR public.is_staff());
CREATE POLICY payments_staff_write ON public.payments_history
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 4. Teléfono: 10 dígitos, único entre clientes (falla si hay duplicados: resolverlos antes).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$');
CREATE UNIQUE INDEX IF NOT EXISTS profiles_customer_phone_uniq
  ON public.profiles (phone) WHERE is_customer AND phone IS NOT NULL;

-- 5. Idempotencia de pagos de Mercado Pago: un mismo pago (notes = 'MP:<id>') no se registra dos veces,
--    aunque el webhook llegue repetido o en simultáneo.
CREATE UNIQUE INDEX IF NOT EXISTS payments_history_mp_ref_uniq
  ON public.payments_history (profile_id, notes) WHERE notes LIKE 'MP:%';

COMMIT;

-- Verificación posterior (correr aparte):
--   select tablename, policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename in ('profiles','orders','payments_history') order by 1,2;
