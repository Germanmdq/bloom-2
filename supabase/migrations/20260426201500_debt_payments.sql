-- Create payments_history table
CREATE TABLE IF NOT EXISTS public.payments_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    method TEXT NOT NULL, -- e.g., 'CASH', 'TRANSFER', 'CARD'
    remaining_balance DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.payments_history ENABLE ROW LEVEL SECURITY;

-- Policies for payments_history
-- Users can view their own payment history
CREATE POLICY "Users can view own payment history" 
ON public.payments_history 
FOR SELECT 
USING (auth.uid() = profile_id);

-- Only service role or secure server actions should insert/update (handled by API)
-- But we can allow authenticated users to see it. 
-- For insertion, we'll use the service role or a specific server action.
