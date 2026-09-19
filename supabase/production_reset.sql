-- 1. RESETEAR TODAS LAS 30 MESAS A LIBRE (limpiar data de prueba)
UPDATE salon_tables 
SET status = 'FREE', 
    total = 0, 
    updated_at = NOW();

-- 2. LIMPIAR ÓRDENES DE PRUEBA
DELETE FROM orders;

-- 3. LIMPIAR MOVIMIENTOS DE STOCK DE PRUEBA
DELETE FROM inventory_movements;

-- 4. VERIFICAR QUE QUEDARON 30 MESAS LIMPIAS
SELECT id, status, total FROM salon_tables ORDER BY id;
