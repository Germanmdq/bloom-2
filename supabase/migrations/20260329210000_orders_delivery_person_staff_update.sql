-- Repartidor asignado (dashboard); staff puede actualizar pedidos (paid, delivery_person_id, etc.)

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_person_id integer;

COMMENT ON COLUMN public.orders.delivery_person_id IS 'Repartidor asignado (1–5); solo aplica a delivery_type = delivery';

DROP POLICY IF EXISTS "orders_staff_update" ON public.orders;

CREATE POLICY "orders_staff_update"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_customer = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_customer = false
    )
  );
