-- Menú público sin login: lectura de productos (precios, imágenes, etc.) para rol anon.
-- Alineado con categories_public_select_anon.
DROP POLICY IF EXISTS "products_public_select_anon" ON public.products;
CREATE POLICY "products_public_select_anon"
ON public.products
FOR SELECT
TO anon
USING (true);
