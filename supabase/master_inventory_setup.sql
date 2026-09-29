-- 1. CORRECCIÓN DE RESTRICCIONES (Para permitir Kilos y Litros)
-- Ejecuta estas líneas para asegurar que la base de datos acepte las nuevas unidades
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_unit_check;
ALTER TABLE public.products ADD CONSTRAINT products_unit_check CHECK (unit IN ('kg', 'g', 'l', 'ml', 'u', 'un', 'unit'));

-- 2. LIMPIEZA DE INSUMOS ANTERIORES
-- Borramos solo la materia prima para recargarla limpia
DELETE FROM public.products WHERE kind = 'raw';

-- 3. CARGA DE STOCK (CARNICERÍA)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Lomo Limpio', 'raw', 'kg', true, 5.0, 0, 0),
('Bife de Chorizo', 'raw', 'kg', true, 10.0, 0, 0),
('Ojo de Bife', 'raw', 'kg', true, 5.0, 0, 0),
('Carne Picada Especial', 'raw', 'kg', true, 15.0, 0, 0),
('Tapa de Asado', 'raw', 'kg', true, 5.0, 0, 0),
('Bondiola de Cerdo', 'raw', 'kg', true, 8.0, 0, 0),
('Matambre Vacuno', 'raw', 'kg', true, 4.0, 0, 0),
('Pollo Entero', 'raw', 'kg', true, 20.0, 0, 0),
('Pechuga de Pollo', 'raw', 'kg', true, 15.0, 0, 0),
('Salmón Rosado', 'raw', 'kg', true, 2.0, 0, 0),
('Langostinos', 'raw', 'kg', true, 2.0, 0, 0);

-- 4. CARGA DE STOCK (VERDULERÍA)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Papa Negra', 'raw', 'kg', true, 100.0, 0, 0),
('Cebolla Común', 'raw', 'kg', true, 40.0, 0, 0),
('Cebolla Morada', 'raw', 'kg', true, 10.0, 0, 0),
('Zanahoria', 'raw', 'kg', true, 15.0, 0, 0),
('Tomate Redondo', 'raw', 'kg', true, 20.0, 0, 0),
('Tomate Perita', 'raw', 'kg', true, 10.0, 0, 0),
('Tomate Cherry', 'raw', 'kg', true, 3.0, 0, 0),
('Lechuga Capuchina', 'raw', 'kg', true, 10.0, 0, 0),
('Lechuga Mantecosa', 'raw', 'kg', true, 5.0, 0, 0),
('Rúcula', 'raw', 'kg', true, 3.0, 0, 0),
('Espinaca', 'raw', 'kg', true, 4.0, 0, 0),
('Morrón Rojo', 'raw', 'kg', true, 5.0, 0, 0),
('Morrón Verde', 'raw', 'kg', true, 3.0, 0, 0),
('Palta Hass', 'raw', 'kg', true, 4.0, 0, 0),
('Limón', 'raw', 'kg', true, 10.0, 0, 0),
('Ajo', 'raw', 'kg', true, 1.0, 0, 0),
('Perejil', 'raw', 'kg', true, 1.0, 0, 0),
('Albahaca', 'raw', 'kg', true, 0.5, 0, 0),
('Batata', 'raw', 'kg', true, 10.0, 0, 0),
('Zapallo Anco', 'raw', 'kg', true, 10.0, 0, 0),
('Champiñones', 'raw', 'kg', true, 2.0, 0, 0);

-- 5. CARGA DE STOCK (ALMACÉN Y SECOS)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Harina 0000', 'raw', 'kg', true, 50.0, 0, 0),
('Harina Leudante', 'raw', 'kg', true, 10.0, 0, 0),
('Arroz Carnaroli', 'raw', 'kg', true, 10.0, 0, 0),
('Arroz Largo Fino', 'raw', 'kg', true, 20.0, 0, 0),
('Fideos Spaghetti', 'raw', 'kg', true, 10.0, 0, 0),
('Fideos Penne Rigate', 'raw', 'kg', true, 10.0, 0, 0),
('Azúcar Blanca', 'raw', 'kg', true, 20.0, 0, 0),
('Azúcar Mascabo', 'raw', 'kg', true, 5.0, 0, 0),
('Sal Fina', 'raw', 'kg', true, 10.0, 0, 0),
('Sal Entrefina', 'raw', 'kg', true, 5.0, 0, 0),
('Aceite Girasol', 'raw', 'l', true, 40.0, 0, 0),
('Aceite Oliva Extra Virgen', 'raw', 'l', true, 10.0, 0, 0),
('Vinagre de Alcohol', 'raw', 'l', true, 5.0, 0, 0),
('Aceto Balsámico', 'raw', 'l', true, 3.0, 0, 0),
('Pan Rallado', 'raw', 'kg', true, 15.0, 0, 0),
('Café en Grano Importado', 'raw', 'kg', true, 10.0, 0, 0),
('Chocolate Semiamargo', 'raw', 'kg', true, 5.0, 0, 0),
('Dulce de Leche Repostero', 'raw', 'kg', true, 10.0, 0, 0);

-- 6. CARGA DE STOCK (LÁCTEOS Y FIAMBRES)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Leche Entera', 'raw', 'l', true, 60.0, 0, 0),
('Leche Descremada', 'raw', 'l', true, 12.0, 0, 0),
('Crema de Leche', 'raw', 'l', true, 10.0, 0, 0),
('Manteca', 'raw', 'kg', true, 10.0, 0, 0),
('Queso Muzzarella Cilindro', 'raw', 'kg', true, 30.0, 0, 0),
('Queso Tybo', 'raw', 'kg', true, 15.0, 0, 0),
('Queso Parmesano', 'raw', 'kg', true, 5.0, 0, 0),
('Queso Azul', 'raw', 'kg', true, 2.0, 0, 0),
('Queso Cheddar Feteado', 'raw', 'kg', true, 5.0, 0, 0),
('Queso Crema', 'raw', 'kg', true, 10.0, 0, 0),
('Jamón Cocido Natural', 'raw', 'kg', true, 15.0, 0, 0),
('Jamón Crudo', 'raw', 'kg', true, 3.0, 0, 0),
('Panceta Ahumada', 'raw', 'kg', true, 5.0, 0, 0),
('Salame Milán', 'raw', 'kg', true, 2.0, 0, 0),
('Huevo Blanco Grade A', 'raw', 'u', true, 180.0, 0, 0);

-- 7. CARGA DE STOCK (PANIFICADOS)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Pan Burger Brioche', 'raw', 'u', true, 100.0, 0, 0),
('Pan Lomo/Baguette', 'raw', 'u', true, 50.0, 0, 0),
('Pan Miga Blanco', 'raw', 'u', true, 20.0, 0, 0),
('Pan Miga Negro', 'raw', 'u', true, 10.0, 0, 0),
('Medialuna de Manteca', 'raw', 'u', true, 100.0, 0, 0),
('Medialuna de Grasa', 'raw', 'u', true, 50.0, 0, 0),
('Pan de Campo (Hogaza)', 'raw', 'u', true, 10.0, 0, 0),
('Baguetin', 'raw', 'u', true, 50.0, 0, 0);

-- 8. CARGA DE STOCK (ADEREZOS)
INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price, cost) VALUES 
('Mayonesa', 'raw', 'kg', true, 5.0, 0, 0),
('Mostaza', 'raw', 'kg', true, 3.0, 0, 0),
('Ketchup', 'raw', 'kg', true, 3.0, 0, 0),
('Salsa Soja', 'raw', 'l', true, 2.0, 0, 0);
