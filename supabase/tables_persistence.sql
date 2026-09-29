-- 1. CREAR EL TIPO DE ESTADO (Si no existe)
DO $$ BEGIN
    CREATE TYPE public.table_status AS ENUM ('FREE', 'OCCUPIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CREAR LA TABLA DE ESTADO DE MESAS
CREATE TABLE IF NOT EXISTS public.salon_tables (
    id INTEGER PRIMARY KEY,
    status public.table_status DEFAULT 'FREE',
    total DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CARGAR LAS 30 MESAS INICIALES (Si no existen)
DO $$
BEGIN
    FOR i IN 1..30 LOOP
        INSERT INTO public.salon_tables (id, status, total)
        VALUES (i, 'FREE', 0)
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- 4. SEGURIDAD (RLS)
ALTER TABLE public.salon_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tables" ON public.salon_tables;
CREATE POLICY "Public read tables" 
ON public.salon_tables FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can update tables" ON public.salon_tables;
CREATE POLICY "Authenticated users can update tables" 
ON public.salon_tables FOR UPDATE TO authenticated USING (true);
