-- Creación de la tabla de Proveedores
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    category TEXT, -- Ej: Bebidas, Carnes, Verduras, Servicios
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Añadir relación en Gastos
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Añadir relación en Movimientos de Inventario
ALTER TABLE public.inventory_movements
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Habilitar RLS en proveedores
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para proveedores
CREATE POLICY "Permitir lectura a todos los autenticados" ON public.suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserción/edición a ADMIN" ON public.suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );
