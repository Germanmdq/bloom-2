-- Imagen opcional por categoría (cartas del menú público)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;
