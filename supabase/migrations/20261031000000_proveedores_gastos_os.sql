-- ============================================================================
-- Proveedores, compras, gastos, pagos a proveedores y registro de la API de Bloom OS
-- NO se ejecuta automáticamente. Revisar y correr a mano (o con aprobación explícita).
-- Es transaccional y aditiva: no borra ni modifica filas existentes, solo agrega
-- columnas con valor por defecto, tablas nuevas y políticas para las tablas nuevas.
--
-- Estado actual de la base viva (verificado 2026-10-31):
--   existen:   suppliers(id,name,phone,email,cuit,address,created_at), expenses(id,description,amount,category,expense_date,created_at)
--   no existen: compras, pagos a proveedores, registro de operaciones de la API
-- Prerrequisito: acceso_clientes.sql ya aplicada (usa public.is_staff()).
-- ============================================================================
BEGIN;

-- 1. Proveedores: datos de contacto y estado (columnas nuevas, con valores por defecto).
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS category text;          -- Bebidas, Carnes, Verduras, Servicios...
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 2. Gastos: medio de pago, proveedor asociado y quién lo cargó.
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'CASH';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by text;

-- 3. Compras a proveedores (lo que se les debe). El saldo del proveedor = compras - pagos.
CREATE TABLE IF NOT EXISTS public.supplier_purchases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  total         numeric(12,2) NOT NULL CHECK (total >= 0),
  items         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{description, quantity, unit_price}]
  invoice_ref   text,
  note          text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_purchases_supplier_idx ON public.supplier_purchases (supplier_id, purchase_date DESC);

-- 4. Pagos a proveedores (opcionalmente imputados a una compra).
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_id   uuid REFERENCES public.supplier_purchases(id) ON DELETE SET NULL,
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  method        text NOT NULL DEFAULT 'CASH',          -- CASH | BANK_TRANSFER | MERCADO_PAGO | CARD
  payment_date  date NOT NULL DEFAULT CURRENT_DATE,
  note          text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_payments_supplier_idx ON public.supplier_payments (supplier_id, payment_date DESC);

-- 5. Registro de cada operación de la API de Bloom OS: auditoría (quién, qué, cuándo) y
--    protección contra duplicados (una misma Idempotency-Key no se ejecuta dos veces).
CREATE TABLE IF NOT EXISTS public.os_api_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  actor           text NOT NULL,                       -- quién (cabecera X-Bloom-OS-Actor)
  method          text NOT NULL,
  path            text NOT NULL,                       -- qué
  idempotency_key text NOT NULL UNIQUE,
  request_hash    text NOT NULL,
  request         jsonb,
  status          integer,                             -- NULL mientras se ejecuta
  response        jsonb,
  finished_at     timestamptz
);
CREATE INDEX IF NOT EXISTS os_api_log_created_idx ON public.os_api_log (created_at DESC);

-- 6. RLS: el personal ve proveedores/compras/pagos; el registro de la API es solo de servidor
--    (RLS activada sin políticas = nadie con clave pública o sesión de usuario puede leerlo).
ALTER TABLE public.supplier_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_api_log         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_purchases_staff ON public.supplier_purchases;
CREATE POLICY supplier_purchases_staff ON public.supplier_purchases
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS supplier_payments_staff ON public.supplier_payments;
CREATE POLICY supplier_payments_staff ON public.supplier_payments
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

COMMIT;

-- Reversión (si hiciera falta; borra solo lo creado acá):
--   DROP TABLE public.os_api_log, public.supplier_payments, public.supplier_purchases;
--   ALTER TABLE public.expenses DROP COLUMN payment_method, DROP COLUMN supplier_id, DROP COLUMN note, DROP COLUMN created_by;
--   ALTER TABLE public.suppliers DROP COLUMN contact_name, DROP COLUMN category, DROP COLUMN notes, DROP COLUMN active;
