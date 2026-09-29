DO $$ 
BEGIN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS kind TEXT CHECK (kind IN ('menu', 'raw')) DEFAULT 'menu';
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT CHECK (unit IN ('g', 'ml', 'u', 'kg', 'l'));
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 2. CREATE RECIPES TABLE (BOM)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    raw_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    qty NUMERIC NOT NULL CHECK (qty > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_product_id, raw_product_id)
);

-- Enable RLS for recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access recipes" ON public.recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. CREATE INVENTORY MOVEMENTS TABLE (LEDGER)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    qty NUMERIC NOT NULL, -- Positive for IN, Negative for OUT
    reason TEXT NOT NULL CHECK (reason IN ('purchase', 'sale', 'waste', 'adjustment', 'opening')),
    ref_table TEXT, -- 'orders', 'manual'
    ref_id UUID, -- order_id or null
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for inventory_movements
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access inventory_movements" ON public.inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. CREATE V_STOCK VIEW
CREATE OR REPLACE VIEW public.v_stock AS
SELECT 
    p.id,
    p.name,
    p.unit,
    p.min_stock,
    COALESCE(SUM(im.qty), 0) as current_stock
FROM 
    public.products p
LEFT JOIN 
    public.inventory_movements im ON p.id = im.raw_product_id
WHERE 
    p.kind = 'raw'
GROUP BY 
    p.id, p.name, p.unit, p.min_stock;

-- 5. MODIFY ORDERS TABLE
-- Add items column to store snapshot and stock_applied flag
DO $$ 
BEGIN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_applied BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 6. AUTOMATION LOGIC

-- RPC: apply_order_to_stock
CREATE OR REPLACE FUNCTION public.apply_order_to_stock(order_id UUID)
RETURNS VOID AS $$
DECLARE
    ord RECORD;
    item JSONB;
    rec RECORD;
    consumption NUMERIC;
BEGIN
    -- Fetch order
    SELECT * INTO ord FROM public.orders WHERE id = order_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- If already applied, exit (idempotency)
    IF ord.stock_applied THEN
        RETURN;
    END IF;

    -- Iterate over items in the order
    FOR item IN SELECT * FROM jsonb_array_elements(ord.items)
    LOOP
        -- Find product by name (since we store name in JSON, ideally we should store ID too, but let's try to match by name or assume ID is in JSON if we updated frontend)
        -- NOTE: Current frontend stores {name, price, quantity}. We need to match by name.
        -- Ideally, we should update frontend to store ID. For now, let's match by Name.
        
        FOR rec IN 
            SELECT r.raw_product_id, r.qty 
            FROM public.recipes r
            JOIN public.products p ON p.id = r.menu_product_id
            WHERE p.name = (item->>'name')::text
        LOOP
            -- Calculate consumption: recipe_qty * item_qty * 1.08 (merma)
            consumption := (rec.qty * (item->>'quantity')::numeric * 1.08);

            -- Insert movement (NEGATIVE)
            INSERT INTO public.inventory_movements (
                raw_product_id, 
                qty, 
                reason, 
                ref_table, 
                ref_id, 
                note
            ) VALUES (
                rec.raw_product_id,
                -consumption,
                'sale',
                'orders',
                ord.id,
                'Auto-deduct details: ' || (item->>'quantity') || 'x ' || (item->>'name')
            );
        END LOOP;
    END LOOP;

    -- Update order flag
    UPDATE public.orders SET stock_applied = true WHERE id = order_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: trg_deduct_stock_on_paid
-- Since Orders are created when paid (inserted), we trigger AFTER INSERT.
CREATE OR REPLACE FUNCTION public.trigger_apply_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Execute deduction
    PERFORM public.apply_order_to_stock(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deduct_stock_on_paid ON public.orders;
CREATE TRIGGER trg_deduct_stock_on_paid
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_apply_stock();
