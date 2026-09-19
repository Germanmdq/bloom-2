-- Ejecutar en Supabase → SQL Editor. Comprueba columnas y tipo de payment_method.
-- Resultado esperado (según migraciones del repo):
--   payment_method → USER-DEFINED → payment_method (enum)
--   payment_notes  → text
--   status         → text
--
-- Valores del enum public.payment_method en el repo:
--   CASH, CARD, MERCADO_PAGO, y tras migración 20260331160000: BANK_TRANSFER

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN ('payment_method', 'payment_notes', 'status');

SELECT e.enumlabel AS payment_method_enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname = 'payment_method'
ORDER BY e.enumsortorder;
