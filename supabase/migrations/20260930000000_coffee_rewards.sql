-- Cada 10 cafés comprados habilitan un café gratis, sin perder el premio.
alter table public.profiles
  add column if not exists free_coffee_rewards integer not null default 0
  check (free_coffee_rewards >= 0);

alter table public.orders
  add column if not exists loyalty_awarded boolean not null default false;
