-- Novedades que ve el cliente en el menú y puede recibir como aviso del navegador.
CREATE TABLE IF NOT EXISTS public.menu_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('promotion', 'plato_del_dia')),
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_promotions
  ADD COLUMN IF NOT EXISTS send_notification BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.menu_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read menu notifications" ON public.menu_notifications;
CREATE POLICY "public can read menu notifications"
  ON public.menu_notifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated can create menu notifications" ON public.menu_notifications;
CREATE POLICY "authenticated can create menu notifications"
  ON public.menu_notifications FOR INSERT
  TO authenticated WITH CHECK (true);
