-- Customer auth: orders.paid, orders.customer_id, loyalty_members, profiles.is_customer, RLS

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_paid ON public.orders(paid);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_customer BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_customer IS 'true = cuenta cliente (OTP); false = staff POS';

-- Loyalty membership
CREATE TABLE IF NOT EXISTS public.loyalty_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_members_select_own" ON public.loyalty_members;
CREATE POLICY "loyalty_members_select_own"
  ON public.loyalty_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "loyalty_members_insert_own" ON public.loyalty_members;
CREATE POLICY "loyalty_members_insert_own"
  ON public.loyalty_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Staff vs customer: new signups from app auth send raw_user_meta_data.is_customer = true
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_is_customer BOOLEAN;
BEGIN
  v_is_customer := COALESCE((NEW.raw_user_meta_data->>'is_customer')::boolean, false);

  INSERT INTO public.profiles (id, full_name, role, is_customer)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', CASE WHEN v_is_customer THEN 'Cliente Bloom' ELSE 'Nuevo Empleado' END),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'WAITER'::public.user_role),
    v_is_customer
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    is_customer = COALESCE(EXCLUDED.is_customer, public.profiles.is_customer);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace orders policies
DROP POLICY IF EXISTS "public_all_orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public access orders" ON public.orders;
DROP POLICY IF EXISTS "Full access orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated view orders" ON public.orders;
DROP POLICY IF EXISTS "orders_anon_insert_guest" ON public.orders;
DROP POLICY IF EXISTS "orders_auth_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_staff_select" ON public.orders;
DROP POLICY IF EXISTS "orders_auth_update_own" ON public.orders;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Guest checkout / chat (no cuenta)
CREATE POLICY "orders_anon_insert_guest"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (customer_id IS NULL);

-- Logged-in: pedido invitado o vinculado a la cuenta
CREATE POLICY "orders_auth_insert"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());

-- Cliente ve solo sus pedidos; staff (is_customer false) ve todo
CREATE POLICY "orders_select_customer_or_staff"
  ON public.orders FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_customer = false
    )
  );

CREATE OR REPLACE FUNCTION public.ensure_loyalty_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.loyalty_members (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_ensure_loyalty_member ON auth.users;
CREATE TRIGGER trg_ensure_loyalty_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_loyalty_member();

COMMENT ON COLUMN public.orders.paid IS 'Cobrado en caja';
COMMENT ON COLUMN public.orders.customer_id IS 'Pedido vinculado a auth.users (cuenta cliente)';
