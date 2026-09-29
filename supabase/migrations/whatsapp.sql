-- Agregar a tu schema existente
CREATE TABLE IF NOT EXISTS pedidos_whatsapp (
  id BIGSERIAL PRIMARY KEY,
  numero_cliente TEXT NOT NULL,
  nombre_cliente TEXT,
  mensaje TEXT NOT NULL,
  items_parseados JSONB,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  total DECIMAL(10,2),
  tiempo_estimado INTEGER, -- minutos
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_whatsapp_estado ON pedidos_whatsapp(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_whatsapp_timestamp ON pedidos_whatsapp(timestamp DESC);

-- RLS
ALTER TABLE pedidos_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver pedidos whatsapp"
  ON pedidos_whatsapp FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden actualizar pedidos whatsapp"
  ON pedidos_whatsapp FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Service Role puede insertar pedidos"
    ON pedidos_whatsapp FOR INSERT
    TO service_role
    WITH CHECK (true);
    
CREATE POLICY "Service Role puede leer pedidos"
    ON pedidos_whatsapp FOR SELECT
    TO service_role
    USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pedidos_whatsapp_updated_at ON pedidos_whatsapp;

CREATE TRIGGER update_pedidos_whatsapp_updated_at 
  BEFORE UPDATE ON pedidos_whatsapp 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
