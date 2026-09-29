-- ================================================
-- MÓDULO COMPRAS & STOCK
-- 2026-04-28
-- ================================================

-- 1. Extender tabla suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS cuit TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) DEFAULT 0;

-- 2. Insumos (Supplies)
CREATE TABLE IF NOT EXISTS public.supplies (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    unit         TEXT NOT NULL DEFAULT 'un',  -- 'kg' | 'l' | 'un'
    stock        NUMERIC(10,3) DEFAULT 0,
    last_purchase_price NUMERIC(10,2),
    supplier_id  UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    active       BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplies_select" ON public.supplies;
CREATE POLICY "supplies_select" ON public.supplies
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "supplies_write_admin" ON public.supplies;
CREATE POLICY "supplies_write_admin" ON public.supplies
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- 3. Compras (Purchases)
CREATE TABLE IF NOT EXISTS public.purchases (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id    UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    invoice_number TEXT,
    date           DATE DEFAULT CURRENT_DATE,
    total          NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'CASH',  -- 'CASH' | 'ACCOUNT'
    created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchases_select" ON public.purchases;
CREATE POLICY "purchases_select" ON public.purchases
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "purchases_write_admin" ON public.purchases;
CREATE POLICY "purchases_write_admin" ON public.purchases
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- 4. Ítems de Compra (Purchase Items)
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id  UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    supply_id    UUID REFERENCES public.supplies(id) ON DELETE SET NULL,
    supply_name  TEXT,
    quantity     NUMERIC(10,3) NOT NULL,
    unit_price   NUMERIC(10,2) NOT NULL,
    subtotal     NUMERIC(12,2) NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_items_select" ON public.purchase_items;
CREATE POLICY "purchase_items_select" ON public.purchase_items
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "purchase_items_write_admin" ON public.purchase_items;
CREATE POLICY "purchase_items_write_admin" ON public.purchase_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- 5. Gastos Fijos (Fixed Expenses)
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    due_date   DATE,
    status     TEXT NOT NULL DEFAULT 'PENDING',   -- 'PENDING' | 'PAID'
    category   TEXT NOT NULL DEFAULT 'NORMAL',    -- 'URGENT' | 'NORMAL'
    recurrent  BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fixed_expenses_select" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses_select" ON public.fixed_expenses
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "fixed_expenses_write_admin" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses_write_admin" ON public.fixed_expenses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- ================================================
-- RPC: Registrar Compra (operación atómica)
-- ================================================
CREATE OR REPLACE FUNCTION public.create_purchase(
    p_supplier_id    UUID,
    p_invoice_number TEXT,
    p_cuit           TEXT,
    p_payment_method TEXT,
    p_items          JSONB   -- [{supply_id, supply_name, quantity, unit_price}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase_id UUID;
    v_total       NUMERIC(12,2) := 0;
    v_item        JSONB;
    v_supplier_name TEXT;
BEGIN
    -- Calcular total
    SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'unit_price')::numeric), 0)
    INTO v_total
    FROM jsonb_array_elements(p_items) AS item;

    -- Registrar compra
    INSERT INTO public.purchases (supplier_id, invoice_number, total, payment_method, date)
    VALUES (p_supplier_id, NULLIF(p_invoice_number, ''), v_total, p_payment_method, CURRENT_DATE)
    RETURNING id INTO v_purchase_id;

    -- Procesar ítems: actualizar stock y precio
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.purchase_items (purchase_id, supply_id, supply_name, quantity, unit_price, subtotal)
        VALUES (
            v_purchase_id,
            (v_item->>'supply_id')::uuid,
            v_item->>'supply_name',
            (v_item->>'quantity')::numeric,
            (v_item->>'unit_price')::numeric,
            (v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric
        );

        UPDATE public.supplies
        SET
            stock               = stock + (v_item->>'quantity')::numeric,
            last_purchase_price = (v_item->>'unit_price')::numeric
        WHERE id = (v_item->>'supply_id')::uuid;
    END LOOP;

    -- Cuenta corriente: sumar deuda al proveedor
    IF p_payment_method = 'ACCOUNT' THEN
        UPDATE public.suppliers SET balance = balance + v_total WHERE id = p_supplier_id;
    ELSE
        -- Efectivo: registrar egreso automático en expenses
        SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = p_supplier_id;
        INSERT INTO public.expenses (description, amount, category, expense_date, supplier_id)
        VALUES (
            'Compra ' || COALESCE(v_supplier_name, '') ||
            CASE WHEN p_invoice_number != '' THEN ' F.' || p_invoice_number ELSE '' END,
            v_total,
            'Mercadería',
            CURRENT_DATE,
            p_supplier_id
        );
    END IF;

    -- Actualizar CUIT si fue provisto
    IF p_cuit IS NOT NULL AND p_cuit != '' THEN
        UPDATE public.suppliers SET cuit = p_cuit WHERE id = p_supplier_id AND (cuit IS NULL OR cuit = '');
    END IF;

    RETURN jsonb_build_object('purchase_id', v_purchase_id, 'total', v_total);
END;
$$;

-- ================================================
-- SEED: Proveedores iniciales
-- ================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Cabrales') THEN
        INSERT INTO public.suppliers (name, category, active) VALUES
            ('Cabrales',    'Bebidas',     true),
            ('Bimbo',       'Panificados', true),
            ('Los Pinos',   'Panificados', true),
            ('San Diego',   'Mercadería',  true),
            ('Casería',     'Lácteos',     true),
            ('Tapamar',     'Mercadería',  true),
            ('Carnicería',  'Carnes',      true),
            ('Avícola',     'Carnes',      true),
            ('Verdulería',  'Verduras',    true);
    END IF;
END $$;

-- ================================================
-- SEED: Insumos por proveedor
-- ================================================
DO $$
DECLARE
    v_cabrales   UUID; v_bimbo     UUID; v_los_pinos UUID;
    v_san_diego  UUID; v_caseria   UUID; v_tapamar   UUID;
    v_carniceria UUID; v_avicola   UUID; v_verduleria UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM public.supplies LIMIT 1) THEN RETURN; END IF;

    SELECT id INTO v_cabrales   FROM public.suppliers WHERE name = 'Cabrales'   LIMIT 1;
    SELECT id INTO v_bimbo      FROM public.suppliers WHERE name = 'Bimbo'      LIMIT 1;
    SELECT id INTO v_los_pinos  FROM public.suppliers WHERE name = 'Los Pinos'  LIMIT 1;
    SELECT id INTO v_san_diego  FROM public.suppliers WHERE name = 'San Diego'  LIMIT 1;
    SELECT id INTO v_caseria    FROM public.suppliers WHERE name = 'Casería'    LIMIT 1;
    SELECT id INTO v_tapamar    FROM public.suppliers WHERE name = 'Tapamar'    LIMIT 1;
    SELECT id INTO v_carniceria FROM public.suppliers WHERE name = 'Carnicería' LIMIT 1;
    SELECT id INTO v_avicola    FROM public.suppliers WHERE name = 'Avícola'    LIMIT 1;
    SELECT id INTO v_verduleria FROM public.suppliers WHERE name = 'Verdulería' LIMIT 1;

    IF v_cabrales IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Café',              'kg', v_cabrales),
            ('Azúcar',            'kg', v_cabrales),
            ('Edulcorante',       'un', v_cabrales),
            ('Submarino (polvo)', 'un', v_cabrales);
    END IF;
    IF v_bimbo IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Rapiditas', 'un', v_bimbo);
    END IF;
    IF v_los_pinos IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Pan de miga',  'un', v_los_pinos),
            ('Medialunas',   'un', v_los_pinos),
            ('Pan lactal',   'un', v_los_pinos);
    END IF;
    IF v_san_diego IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Aceite', 'l',  v_san_diego),
            ('Sal',    'kg', v_san_diego),
            ('Harina', 'kg', v_san_diego),
            ('Fideos', 'kg', v_san_diego),
            ('Arroz',  'kg', v_san_diego),
            ('Yerba',  'kg', v_san_diego);
    END IF;
    IF v_caseria IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Manteca',        'kg', v_caseria),
            ('Queso cremoso',  'kg', v_caseria),
            ('Queso rallado',  'kg', v_caseria),
            ('Crema de leche', 'l',  v_caseria),
            ('Leche',          'l',  v_caseria);
    END IF;
    IF v_tapamar IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Mayonesa', 'un', v_tapamar),
            ('Ketchup',  'un', v_tapamar),
            ('Mostaza',  'un', v_tapamar);
    END IF;
    IF v_carniceria IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Carne picada',    'kg', v_carniceria),
            ('Bife de costilla','kg', v_carniceria),
            ('Peceto',          'kg', v_carniceria);
    END IF;
    IF v_avicola IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Pechuga de pollo', 'kg', v_avicola),
            ('Pata muslo',       'kg', v_avicola),
            ('Huevos',           'un', v_avicola);
    END IF;
    IF v_verduleria IS NOT NULL THEN
        INSERT INTO public.supplies (name, unit, supplier_id) VALUES
            ('Lechuga',   'kg', v_verduleria),
            ('Tomate',    'kg', v_verduleria),
            ('Cebolla',   'kg', v_verduleria),
            ('Papa',      'kg', v_verduleria),
            ('Zanahoria', 'kg', v_verduleria),
            ('Ajo',       'kg', v_verduleria);
    END IF;
END $$;

-- ================================================
-- SEED: Gastos fijos
-- ================================================
DO $$
DECLARE
    v_due DATE;
BEGIN
    IF EXISTS (SELECT 1 FROM public.fixed_expenses LIMIT 1) THEN RETURN; END IF;

    -- Vencimiento: día 10 del mes actual o siguiente
    IF EXTRACT(DAY FROM CURRENT_DATE) <= 10 THEN
        v_due := date_trunc('month', CURRENT_DATE) + interval '9 days';
    ELSE
        v_due := date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '9 days';
    END IF;

    INSERT INTO public.fixed_expenses (name, amount, due_date, status, category) VALUES
        ('Alquiler',          2000000,  v_due, 'PENDING', 'URGENT'),
        ('Luz',               1000000,  v_due, 'PENDING', 'URGENT'),
        ('Sueldo Carla',      6875000,  v_due, 'PENDING', 'URGENT'),
        ('Sueldo Alina',      6875000,  v_due, 'PENDING', 'URGENT'),
        ('Expensas',           248000,  v_due, 'PENDING', 'NORMAL'),
        ('Contador',           700000,  v_due, 'PENDING', 'NORMAL'),
        ('Tasas Municipales',       0,  v_due, 'PENDING', 'NORMAL'),
        ('OSSE (Agua)',             0,  v_due, 'PENDING', 'NORMAL'),
        ('Gas',                     0,  v_due, 'PENDING', 'NORMAL'),
        ('Contenedor',              0,  v_due, 'PENDING', 'NORMAL');
END $$;
