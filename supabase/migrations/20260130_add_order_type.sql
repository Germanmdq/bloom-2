-- Add order_type column to salon_tables
ALTER TABLE public.salon_tables 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'LOCAL';

-- Add check constraint for valid types if needed, or just keep it flexible
ALTER TABLE public.salon_tables 
DROP CONSTRAINT IF EXISTS salon_tables_order_type_check;

ALTER TABLE public.salon_tables 
ADD CONSTRAINT salon_tables_order_type_check 
CHECK (order_type IN ('LOCAL', 'DELIVERY'));
