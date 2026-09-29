-- ============================================================
-- FIX: Políticas RLS para salon_tables
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Asegurar que la tabla tenga las columnas necesarias
ALTER TABLE public.salon_tables ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.salon_tables ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'LOCAL';

-- 2. Eliminar TODAS las policies viejas de salon_tables
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'salon_tables' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.salon_tables', r.policyname);
  END LOOP;
END $$;

-- 3. Crear UNA sola policy permisiva (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "full_access_salon_tables" 
ON public.salon_tables FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Verificar que RLS está habilitado
ALTER TABLE public.salon_tables ENABLE ROW LEVEL SECURITY;

-- 5. Asegurar que las mesas 1-36 existan
INSERT INTO public.salon_tables (id, status, total, items, order_type)
SELECT i, 'FREE', 0, '[]'::jsonb, 'LOCAL'
FROM generate_series(1, 36) AS i
ON CONFLICT (id) DO NOTHING;
