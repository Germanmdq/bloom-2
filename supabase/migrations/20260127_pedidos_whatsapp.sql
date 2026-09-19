-- Create enum for order status
create type whatsapp_order_status as enum (
  'pendiente',
  'confirmado',
  'preparando',
  'listo',
  'entregado',
  'cancelado'
);

-- Create table for WhatsApp orders
create table if not exists pedidos_whatsapp (
  id serial primary key,
  numero_cliente text not null,
  nombre_cliente text,
  mensaje text not null,
  items_parseados jsonb,
  estado whatsapp_order_status not null default 'pendiente',
  total decimal(10, 2),
  tiempo_estimado integer, -- in minutes
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists idx_pedidos_whatsapp_estado on pedidos_whatsapp(estado);
create index if not exists idx_pedidos_whatsapp_created_at on pedidos_whatsapp(created_at desc);
create index if not exists idx_pedidos_whatsapp_numero_cliente on pedidos_whatsapp(numero_cliente);

-- Enable Row Level Security
alter table pedidos_whatsapp enable row level security;

-- Create policy for authenticated users (POS operators)
create policy "Enable all access for authenticated users" on pedidos_whatsapp
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Create policy for service role (WhatsApp service)
-- Ideally, the service uses the service_role key which bypasses RLS,
-- but creating a policy for anon access restricted by IP or specific headers 
-- might be needed if not using service role properly. 
-- For now, we assume the service uses SERVICE_ROLE_KEY.

-- Function to automatically update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger update_pedidos_whatsapp_updated_at
before update on pedidos_whatsapp
for each row
execute function update_updated_at_column();
