-- Tokens de login de un solo uso para links de WhatsApp
CREATE TABLE IF NOT EXISTS public.login_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at    TIMESTAMPTZ,
  label      TEXT,                        -- Ej: "Cumpleaños Martina"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_tokens ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo accesible vía service role desde las API routes
