-- Imagen de fachada para el sitio público (home / about)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS fachada_image_url TEXT;

COMMENT ON COLUMN public.app_settings.fachada_image_url IS 'URL pública (p. ej. Storage Supabase) de la foto de fachada; si es NULL se usa /images/bloom-fachada.png';

-- Bucket público para assets del sitio (imagen subida desde script o dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site', 'site', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lectura pública de objetos en `site`
DROP POLICY IF EXISTS "site_public_read" ON storage.objects;
CREATE POLICY "site_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'site');

-- Staff autenticado puede subir/actualizar/borrar (dashboard o script con sesión)
DROP POLICY IF EXISTS "site_authenticated_insert" ON storage.objects;
CREATE POLICY "site_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site');

DROP POLICY IF EXISTS "site_authenticated_update" ON storage.objects;
CREATE POLICY "site_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site')
WITH CHECK (bucket_id = 'site');

DROP POLICY IF EXISTS "site_authenticated_delete" ON storage.objects;
CREATE POLICY "site_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site');
