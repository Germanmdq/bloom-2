-- Debug: últimos pedidos vinculados a TU cuenta (no uses un email fijo).
-- En SQL Editor, ejecutá con rol "authenticated" / impersonación para que auth.uid() sea tu usuario,
-- o reemplazá auth.uid() por tu UUID (Dashboard → Authentication → Users).
SELECT
  id,
  order_type,
  delivery_type,
  status,
  customer_name,
  paid,
  customer_id,
  created_at
FROM public.orders
WHERE customer_id = auth.uid()
ORDER BY created_at DESC
LIMIT 3;
