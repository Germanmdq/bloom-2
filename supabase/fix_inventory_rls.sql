-- =============================================
-- FIX RLS POLICIES (ALLOW PUBLIC/ANON ACCESS)
-- =============================================

-- 1. Inventory Movements
DROP POLICY IF EXISTS "Full access inventory_movements" ON public.inventory_movements;
CREATE POLICY "Public access inventory_movements" ON public.inventory_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Recipes
DROP POLICY IF EXISTS "Full access recipes" ON public.recipes;
CREATE POLICY "Public access recipes" ON public.recipes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Products (Ensure Update is allowed for stock tracking)
DROP POLICY IF EXISTS "Full access products" ON public.products;
CREATE POLICY "Public access products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Orders (Ensure Insert/Update is allowed)
DROP POLICY IF EXISTS "Full access orders" ON public.orders;
CREATE POLICY "Public access orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
