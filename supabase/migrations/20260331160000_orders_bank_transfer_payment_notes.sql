-- Web encargos: bank transfer as payment option; optional free-text notes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Extend enum (existing: CASH, CARD, MERCADO_PAGO)
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';

COMMENT ON COLUMN public.orders.payment_notes IS 'Detalle de pago web (ej. transferencia) cuando aplica';
