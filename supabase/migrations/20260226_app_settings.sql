-- Tabla única fila para configuración general del local
CREATE TABLE IF NOT EXISTS public.app_settings (
    id        INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- solo 1 fila
    mesas     INTEGER NOT NULL DEFAULT 10,
    barra     INTEGER NOT NULL DEFAULT 3,
    whatsapp  TEXT    NOT NULL DEFAULT '5491112345678',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar fila default si no existe
INSERT INTO public.app_settings (id, mesas, barra, whatsapp)
VALUES (1, 10, 3, '5491112345678')
ON CONFLICT (id) DO NOTHING;

-- RLS: solo usuarios autenticados pueden leer/escribir
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read settings"
ON public.app_settings FOR SELECT
TO authenticated USING (true);

CREATE POLICY "authenticated can update settings"
ON public.app_settings FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
