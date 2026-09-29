-- 1. POLÍTICAS PARA GASTOS (expenses)
-- Permitir que cualquier usuario autenticado vea los gastos
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.expenses;
CREATE POLICY "Enable read for all authenticated" ON public.expenses FOR SELECT TO authenticated USING (true);

-- Permitir que cualquier usuario autenticado inserte gastos
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.expenses;
CREATE POLICY "Enable insert for all authenticated" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);

-- 2. POLÍTICAS PARA OTROS MÓDULOS (por si acaso faltan)
-- Órdenes
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);

-- Personal (profiles)
-- Asegurar que los usuarios puedan ver su propio perfil y el de otros (para el historial)
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
