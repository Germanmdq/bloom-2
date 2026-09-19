-- Fix: agregar RETIRO al constraint de order_type
ALTER TABLE public.salon_tables
DROP CONSTRAINT IF EXISTS salon_tables_order_type_check;

ALTER TABLE public.salon_tables
ADD CONSTRAINT salon_tables_order_type_check
CHECK (order_type IN ('LOCAL', 'DELIVERY', 'RETIRO'));
