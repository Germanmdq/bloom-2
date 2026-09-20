-- ====================================================================
-- BLOOM - INICIALIZAR MESAS 1 A 40 EN SUPABASE
-- Ejecutar en: https://supabase.com/dashboard/project/zcgctaqzqcpqopforttc/sql
-- ====================================================================

INSERT INTO public.salon_tables (id, status, total)
SELECT generate_series(1, 40), 'FREE', 0
ON CONFLICT (id) DO NOTHING;

-- Asegurar políticas de acceso para el salón
DO $$ BEGIN
  CREATE POLICY "Public read salon_tables" ON public.salon_tables 
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Auth full salon_tables" ON public.salon_tables 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
