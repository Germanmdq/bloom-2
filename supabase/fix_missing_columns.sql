-- ====================================================================
-- BLOOM - MIGRACIÓN DE COLUMNAS FALTANTES Y CONFIRMACIÓN DE ADMIN
-- Ejecutar en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/zcgctaqzqcpqopforttc/sql
-- ====================================================================

-- 1. COLUMNAS FALTANTES EN ORDERS
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_info TEXT,
  ADD COLUMN IF NOT EXISTS cuenta_corriente BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cae TEXT,
  ADD COLUMN IF NOT EXISTS voucher_number TEXT,
  ADD COLUMN IF NOT EXISTS cae_expiration TEXT,
  ADD COLUMN IF NOT EXISTS debt_payment_amount DECIMAL(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- 2. COLUMNAS FALTANTES EN PROFILES
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_customer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coffee_stamps INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_number TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS birthdate DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS default_address TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_customer_number ON public.profiles(customer_number);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. TABLA PAYMENTS_HISTORY (Historial de pagos de deuda)
CREATE TABLE IF NOT EXISTS public.payments_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  method TEXT NOT NULL,
  remaining_balance DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE public.payments_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Auth full payments_history" ON public.payments_history
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. CONFIRMAR ADMIN Y ASEGURAR PERFIL
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW() 
WHERE email = 'admin@bloom.com';

INSERT INTO public.profiles (id, full_name, role, is_customer)
SELECT id, 'Administrador Bloom', 'ADMIN'::public.user_role, false
FROM auth.users
WHERE email = 'admin@bloom.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'ADMIN'::public.user_role,
    is_customer = false;

-- 5. POLÍTICAS DE LECTURA PÚBLICA PARA PROFILES SI FUERA NECESARIO
DO $$ BEGIN
  CREATE POLICY "Public read profiles" ON public.profiles 
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
