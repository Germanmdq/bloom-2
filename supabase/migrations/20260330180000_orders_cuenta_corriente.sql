-- Cuenta corriente / fiado (dashboard staff)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cuenta_corriente boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.cuenta_corriente IS 'Pedido en cuenta corriente; staff puede combinar con paid para lealtad';
