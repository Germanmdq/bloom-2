-- ====================================================================
-- BLOOM - CONFIGURACIÓN DE SALON_TABLES (COLUMNAS, RLS Y MESAS 1 A 40)
-- Ejecutar en: https://supabase.com/dashboard/project/zcgctaqzqcpqopforttc/sql
-- ====================================================================

-- 1. Agregar columnas faltantes a salon_tables
ALTER TABLE public.salon_tables
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'LOCAL';

-- 2. Asegurar permisos de acceso completo para el salón (anon y authenticated)
DROP POLICY IF EXISTS "Full access tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Public read tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Public access tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Auth full salon_tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Public read salon_tables" ON public.salon_tables;

CREATE POLICY "Public access tables"
ON public.salon_tables FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

-- 3. Inicializar mesas 1 a 40
INSERT INTO public.salon_tables (id, status, total, items, order_type)
SELECT i, 'FREE', 0, '[]'::jsonb, 'LOCAL'
FROM generate_series(1, 40) AS i
ON CONFLICT (id) DO NOTHING;
