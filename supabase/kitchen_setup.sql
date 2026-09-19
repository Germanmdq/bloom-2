-- Create enum for kitchen ticket status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kitchen_ticket_status') THEN
        CREATE TYPE kitchen_ticket_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED');
    END IF;
END $$;

-- Create kitchen_tickets table
CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id INTEGER REFERENCES public.salon_tables(id),
    items JSONB NOT NULL,
    status public.kitchen_ticket_status DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
DROP POLICY IF EXISTS "Full access to kitchen_tickets for authenticated users" ON public.kitchen_tickets;
CREATE POLICY "Full access to kitchen_tickets for authenticated users"
ON public.kitchen_tickets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_kitchen_tickets_updated_at ON public.kitchen_tickets;
CREATE TRIGGER update_kitchen_tickets_updated_at
BEFORE UPDATE ON public.kitchen_tickets
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
