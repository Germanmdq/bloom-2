-- ============================================
-- RESET COMPLETO CON DATOS REALES DE BLOOM
-- ============================================
DELETE FROM public.compras_detalle;
DELETE FROM public.compras;
DELETE FROM public.insumos;
DELETE FROM public.gastos_fijos;
DELETE FROM public.proveedores;

-- ============================================
-- PROVEEDORES
-- ============================================
INSERT INTO public.proveedores (nombre) VALUES
('Leche'),
('La Caseriana'),
('San Diego'),
('Cabrales'),
('Coca'),
('Soda'),
('Carniceria'),
('Avicola'),
('Guido'),
('Facturas'),
('Pastelera'),
('Bimbo'),
('Los Pinos'),
('Tapamar'),
('La Hechicera'),
('Verduleria'),
('El Vasquito'),
('Papelera'),
('Todo para la gastronomia');

-- ============================================
-- INSUMOS: Leche
-- ============================================
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Leche','un',0,0,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Leche' LIMIT 1)),
('Dulce de leche','un',0,0,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Leche' LIMIT 1)),
('Crema','un',0,0,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Leche' LIMIT 1));

-- INSUMOS: La Caseriana
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Sorrentinos de calabaza','un',0,0,'Pastas',(SELECT id FROM proveedores WHERE nombre='La Caseriana' LIMIT 1)),
('Ravioles de verdura','un',0,0,'Pastas',(SELECT id FROM proveedores WHERE nombre='La Caseriana' LIMIT 1));

-- INSUMOS: San Diego
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Noquis','un',0,0,'Pastas',(SELECT id FROM proveedores WHERE nombre='San Diego' LIMIT 1)),
('Fideos','un',0,0,'Pastas',(SELECT id FROM proveedores WHERE nombre='San Diego' LIMIT 1));

-- INSUMOS: Cabrales
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Cafe','un',0,0,'Cafeteria',(SELECT id FROM proveedores WHERE nombre='Cabrales' LIMIT 1)),
('Azucar','un',0,0,'Cafeteria',(SELECT id FROM proveedores WHERE nombre='Cabrales' LIMIT 1)),
('Edulcorante','un',0,0,'Cafeteria',(SELECT id FROM proveedores WHERE nombre='Cabrales' LIMIT 1)),
('Submarino','un',0,0,'Cafeteria',(SELECT id FROM proveedores WHERE nombre='Cabrales' LIMIT 1));

-- INSUMOS: Coca
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Coca Cola','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Sprite','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Fanta','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Coca Zero','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Sprite Zero','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Aquarius Manzana','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Aquarius Pomelo','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Aquarius Naranja','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Aquarius Uva','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1)),
('Schweppes Pomelo','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Coca' LIMIT 1));

-- INSUMOS: Soda
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Sifones de soda','un',0,0,'Bebidas',(SELECT id FROM proveedores WHERE nombre='Soda' LIMIT 1));

-- INSUMOS: Carniceria
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Milanesas','un',0,0,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1)),
('Bife','un',0,0,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1)),
('Picada','un',0,0,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1)),
('Bife de cerdo','un',0,0,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1));

-- INSUMOS: Avicola
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Pata muslo','un',0,0,'Avicola',(SELECT id FROM proveedores WHERE nombre='Avicola' LIMIT 1)),
('Pechuga','un',0,0,'Avicola',(SELECT id FROM proveedores WHERE nombre='Avicola' LIMIT 1));

-- INSUMOS: Guido
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Alfajores','un',0,0,'Panaderia',(SELECT id FROM proveedores WHERE nombre='Guido' LIMIT 1));

-- INSUMOS: Facturas
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Facturas','un',0,0,'Panaderia',(SELECT id FROM proveedores WHERE nombre='Facturas' LIMIT 1));

-- INSUMOS: Pastelera
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Lemon pie','un',0,0,'Pasteleria',(SELECT id FROM proveedores WHERE nombre='Pastelera' LIMIT 1)),
('Brownie','un',0,0,'Pasteleria',(SELECT id FROM proveedores WHERE nombre='Pastelera' LIMIT 1)),
('Coco','un',0,0,'Pasteleria',(SELECT id FROM proveedores WHERE nombre='Pastelera' LIMIT 1));

-- INSUMOS: Bimbo
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Rapiditas XXL','un',0,0,'Panificados',(SELECT id FROM proveedores WHERE nombre='Bimbo' LIMIT 1)),
('Brownie choc','un',0,0,'Panificados',(SELECT id FROM proveedores WHERE nombre='Bimbo' LIMIT 1));

-- INSUMOS: Los Pinos
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Pan de miga','un',0,0,'Panificados',(SELECT id FROM proveedores WHERE nombre='Los Pinos' LIMIT 1)),
('Pan rallado','un',0,0,'Panificados',(SELECT id FROM proveedores WHERE nombre='Los Pinos' LIMIT 1));

-- INSUMOS: Tapamar
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Tapas de empanadas','un',0,0,'Tapas',(SELECT id FROM proveedores WHERE nombre='Tapamar' LIMIT 1));

-- INSUMOS: La Hechicera
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Alfajores sin TACC','un',0,0,'Sin TACC',(SELECT id FROM proveedores WHERE nombre='La Hechicera' LIMIT 1));

-- INSUMOS: Verduleria
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Cebolla','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Papa','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Zanahoria','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Morron','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Ajo','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Lechuga','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Tomate','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Albahaca','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Palta','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Huevos','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Banana','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Frutilla','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Limon','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Menta','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Perejil','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Tomate cherry','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Naranja','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Zapallo anco','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Zapallito','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Verdeo','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Jengibre','un',0,0,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1));

-- INSUMOS: El Vasquito
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Pocillos','un',0,0,'Vajilla',(SELECT id FROM proveedores WHERE nombre='El Vasquito' LIMIT 1)),
('Jarros','un',0,0,'Vajilla',(SELECT id FROM proveedores WHERE nombre='El Vasquito' LIMIT 1)),
('Taza','un',0,0,'Vajilla',(SELECT id FROM proveedores WHERE nombre='El Vasquito' LIMIT 1)),
('Cucharitas','un',0,0,'Vajilla',(SELECT id FROM proveedores WHERE nombre='El Vasquito' LIMIT 1)),
('Sodines','un',0,0,'Vajilla',(SELECT id FROM proveedores WHERE nombre='El Vasquito' LIMIT 1));

-- INSUMOS: Papelera
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Servilletas 18','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Servilletas 33','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Vasos craft 8 onzas','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Vasos craft 12 onzas','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bandejas carton redondo N3','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bandejas carton redondo N5','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bolsa craft N3','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bolsa craft N5','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bolsa craft N7','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bandejas micro 103','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bandejas micro 105','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bandejas micro 107','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Revolvedores','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Papel higienico','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Toallas intercaladas','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Rollo de papel 45 cm','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Ensaladeras con tapa redonda cristal','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bolsas camiseta 30x40','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bolsas camiseta 40x50','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bolsas arranque 15x20','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bolsas arranque 25x30','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Bandeja doble para cafe','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Individuales de papel','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Folex','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1)),
('Separadores','un',0,0,'Descartables',(SELECT id FROM proveedores WHERE nombre='Papelera' LIMIT 1));

-- INSUMOS: Todo para la gastronomia
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Arroz por 5 kg','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Salsa Caesar doypack 900g','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Individuales de mayonesa','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Individuales de ketchup','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Individuales de savora','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Individuales de manteca','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Individuales de dulce de leche','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Individuales de mermelada','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Aceite','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Vinagre','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Sal','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Limon','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Azafran','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1)),
('Queso crema','un',0,0,'Almacen',(SELECT id FROM proveedores WHERE nombre='Todo para la gastronomia' LIMIT 1));

-- ============================================
-- GASTOS FIJOS
-- ============================================
INSERT INTO public.gastos_fijos (nombre, monto, fecha_vencimiento, estado, categoria) VALUES
('Alquiler', 2000000, '2026-05-05', 'pendiente', 'urgente'),
('Luz', 1000000, '2026-05-05', 'pendiente', 'urgente'),
('Sueldo Carla', 12500000, '2026-05-05', 'pendiente', 'urgente'),
('Sueldo Alina', 1250000, '2026-05-05', 'pendiente', 'urgente'),
('Contador', 70000, '2026-05-10', 'pendiente', 'normal'),
('Expensas', 248000, '2026-05-05', 'pendiente', 'urgente'),
('Gas', 120000, '2026-05-15', 'pendiente', 'normal'),
('Contenedor', 120000, '2026-05-05', 'pendiente', 'urgente'),
('Diariero', 33000, '2026-05-05', 'pendiente', 'normal'),
('OSSE Obras Sanitarias', 0, '2026-05-15', 'pendiente', 'normal'),
('Guido Ricicol - Retiro aceites', 0, '2026-05-15', 'pendiente', 'normal'),
('TSU Tasas Municipales', 27000, '2026-05-15', 'pendiente', 'normal'),
('TSH Tasas Municipales', 7000, '2026-05-15', 'pendiente', 'normal');
