-- Bucket público para fotos de categorías del menú (URLs en public.categories.image_url)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "menu_images_public_read" ON storage.objects;
CREATE POLICY "menu_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "menu_images_authenticated_insert" ON storage.objects;
CREATE POLICY "menu_images_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "menu_images_authenticated_update" ON storage.objects;
CREATE POLICY "menu_images_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-images')
WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "menu_images_authenticated_delete" ON storage.objects;
CREATE POLICY "menu_images_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images');
