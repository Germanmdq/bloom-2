-- Agrega columna items para persistir el carrito de cada mesa entre sesiones
ALTER TABLE public.salon_tables
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
