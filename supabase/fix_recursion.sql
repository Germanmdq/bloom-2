-- 1. LIMPIEZA TOTAL PARA ELIMINAR RECURSIÓN
-- Desactivamos RLS momentáneamente para poder limpiar sin errores
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Borrar TODAS las políticas existentes en la tabla profiles para empezar de cero
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- 2. RE-ACTIVAR SEGURIDAD CON POLÍTICAS SIMPLES Y SEGURAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Cualquier usuario conectado puede ver todos los perfiles
-- (Sin JOINs ni chequeos extras que causen recursión)
CREATE POLICY "Public read profiles" 
ON public.profiles FOR SELECT TO authenticated 
USING (true);

-- Política de actualización: Solo el propio usuario puede editar su perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id);

-- 3. VERIFICACIÓN DE PERMISOS PARA OTROS ROLES (Opcional pero recomendado)
-- Asegurar que la tabla orders también tenga permisos limpios
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders" 
ON public.orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
CREATE POLICY "Authenticated users can view orders" 
ON public.orders FOR SELECT TO authenticated USING (true);
