-- Menú público sin login: el cliente anónimo debe poder leer categorías (incl. image_url).
-- Sin esto, la app nunca recibe las URLs aunque el bucket sea público.
DROP POLICY IF EXISTS "categories_public_select_anon" ON public.categories;
CREATE POLICY "categories_public_select_anon"
ON public.categories
FOR SELECT
TO anon
USING (true);

-- Storage: lectura explícita para rol anon en el bucket del menú (refuerzo del bucket público).
DROP POLICY IF EXISTS "menu_images_anon_read" ON storage.objects;
CREATE POLICY "menu_images_anon_read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'menu-images');
