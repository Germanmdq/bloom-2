-- Monto de pago de deuda CC incluido en pagos online (MercadoPago)
-- El webhook usa este campo para reducir el balance del profile tras pago aprobado.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS debt_payment_amount numeric DEFAULT 0;

COMMENT ON COLUMN public.orders.debt_payment_amount IS 'Monto de deuda de cuenta corriente incluido en el pago online. El webhook lo usa para actualizar profiles.balance.';
