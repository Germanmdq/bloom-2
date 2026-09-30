-- ════════════════════════════════════════════════════════════════════
--  Módulo Veterinaria + Pet Shop (Vida de Perros)
--  Tablas vet_* independientes de las tablas de la cafetería.
--
--  Roles:
--    ADMIN     → modifica todo.
--    EMPLEADO  → pedidos, turnos, clientes, mascotas y stock (no precios).
--    CLIENTE   → su cuenta, sus mascotas, sus pedidos y turnos.
--  Visitantes (anon) → solo leen el catálogo público.
--
--  Pedidos, turnos y lista de espera se crean desde rutas de servidor
--  (/api/veterinaria/*) con la service role, que recalculan precios y
--  disponibilidad: el navegador nunca inserta directamente.
-- ════════════════════════════════════════════════════════════════════

-- ─── Personal y roles ───────────────────────────────────────────────
create table if not exists vet_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'EMPLEADO')),
  name text,
  created_at timestamptz not null default now()
);

create or replace function vet_role() returns text
language sql stable security definer set search_path = public as $$
  select role from vet_staff where user_id = auth.uid()
$$;

create or replace function vet_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vet_staff where user_id = auth.uid())
$$;

create or replace function vet_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vet_staff where user_id = auth.uid() and role = 'ADMIN')
$$;

-- ─── Catálogo ───────────────────────────────────────────────────────
create table if not exists vet_categories (
  id text primary key,
  slug text unique not null,
  name text not null,
  description text,
  icon text not null default 'Package',
  image text,
  "order" int not null default 0,
  visible boolean not null default true,
  requires_consultation boolean not null default false,
  consumable boolean not null default false
);

create table if not exists vet_products (
  id text primary key,
  slug text unique not null,
  code text,
  name text not null,
  description text,
  category_id text references vet_categories(id) on update cascade,
  subcategory text,
  brand text,
  species text[] not null default '{}',
  tags text[] not null default '{}',
  images text[] not null default '{}',
  price numeric(12,2),
  compare_at_price numeric(12,2),
  sku text,
  barcode text,
  size text,
  variants jsonb not null default '[]',
  stock int,
  min_stock int not null default 2,
  visible boolean not null default true,
  featured boolean not null default false,
  requires_consultation boolean not null default false,
  related_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vet_products_category_idx on vet_products(category_id);
create index if not exists vet_products_barcode_idx on vet_products(barcode);

-- Datos internos del producto (costo, proveedor). Solo personal.
create table if not exists vet_product_costs (
  product_id text primary key references vet_products(id) on delete cascade,
  cost numeric(12,2),
  supplier_url text,
  internal_notes text,
  updated_at timestamptz not null default now()
);

create table if not exists vet_stock_movements (
  id text primary key,
  product_id text references vet_products(id) on delete cascade,
  variant_id text,
  type text not null check (type in ('entrada', 'salida', 'ajuste', 'venta', 'devolucion')),
  quantity int not null,
  resulting_stock int not null,
  reason text,
  order_id text,
  user_name text,
  created_at timestamptz not null default now()
);
create index if not exists vet_stock_movements_product_idx on vet_stock_movements(product_id, created_at desc);

create table if not exists vet_services (
  id text primary key,
  slug text unique not null,
  kind text not null,
  name text not null,
  description text,
  icon text not null default 'Stethoscope',
  duration_min int not null default 30,
  price numeric(12,2),
  price_note text,
  days int[] not null default '{1,2,3,4,5,6}',
  hours jsonb not null default '[]',
  capacity int not null default 1,
  species text[] not null default '{}',
  visible boolean not null default true,
  "order" int not null default 0,
  repeat_every_days int
);

create table if not exists vet_blocked_slots (
  id text primary key,
  date date not null,
  time text,
  service_id text references vet_services(id) on delete cascade,
  reason text
);

create table if not exists vet_combos (
  id text primary key,
  slug text unique not null,
  name text not null,
  description text,
  items jsonb not null default '[]',
  price numeric(12,2),
  image text,
  active boolean not null default true,
  demo boolean,
  created_at timestamptz not null default now()
);

create table if not exists vet_coupons (
  id text primary key,
  code text unique,
  title text not null,
  description text,
  type text not null check (type in ('porcentaje', 'fijo', 'envio_gratis', 'dos_por_uno')),
  value numeric(12,2) not null default 0,
  starts_at date,
  ends_at date,
  max_uses int,
  used_count int not null default 0,
  min_purchase numeric(12,2),
  product_ids text[] not null default '{}',
  category_ids text[] not null default '{}',
  audience text not null default 'todos',
  active boolean not null default true,
  public boolean not null default false,
  demo boolean,
  created_at timestamptz not null default now()
);

create table if not exists vet_shipping_zones (
  id text primary key,
  name text not null,
  description text,
  price numeric(12,2),
  free_from numeric(12,2),
  max_km numeric(6,2),
  active boolean not null default true,
  "order" int not null default 0
);

create table if not exists vet_reviews (
  id text primary key,
  name text not null,
  photo text,
  text text not null,
  rating int not null check (rating between 1 and 5),
  date date not null default current_date,
  source text not null default 'manual',
  visible boolean not null default true,
  demo boolean
);

create table if not exists vet_faqs (
  id text primary key,
  question text not null,
  answer text not null,
  "order" int not null default 0,
  visible boolean not null default true
);

create table if not exists vet_recommendation_rules (
  id text primary key,
  name text not null,
  when_category_ids text[] not null default '{}',
  when_tags text[] not null default '{}',
  recommend_category_ids text[] not null default '{}',
  recommend_product_ids text[] not null default '{}',
  label text not null default 'También te puede interesar',
  active boolean not null default true
);

create table if not exists vet_settings (
  id text primary key default 'main',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ─── Clientes, mascotas, pedidos, turnos ────────────────────────────
create table if not exists vet_customers (
  id text primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  address jsonb,
  points int not null default 0,
  favorite_ids text[] not null default '{}',
  marketing_opt_in boolean not null default false,
  notes text,
  tier_override text,
  demo boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vet_customers_phone_idx on vet_customers(phone);

create or replace function vet_my_customer_id() returns text
language sql stable security definer set search_path = public as $$
  select id from vet_customers where user_id = auth.uid()
$$;

create table if not exists vet_pets (
  id text primary key,
  customer_id text not null references vet_customers(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  sex text not null default 'desconocido',
  birth_date date,
  approx_age_years numeric(4,1),
  weight_kg numeric(6,2),
  photo text,
  notes text,
  vaccines jsonb,
  demo boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists vet_order_number_seq start 1001;

create table if not exists vet_orders (
  id text primary key,
  number int not null default nextval('vet_order_number_seq') unique,
  customer_id text references vet_customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text,
  items jsonb not null,
  totals jsonb not null,
  coupon_code text,
  payment_method text not null,
  delivery_method text not null,
  shipping_zone_id text,
  address jsonb,
  notes text,
  status text not null default 'nuevo' check (status in ('nuevo','pago_pendiente','pagado','preparando','en_camino','listo_retirar','entregado','cancelado')),
  status_history jsonb not null default '[]',
  source text not null default 'web',
  demo boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vet_orders_created_idx on vet_orders(created_at desc);
create index if not exists vet_orders_customer_idx on vet_orders(customer_id);

create table if not exists vet_appointments (
  id text primary key,
  service_id text references vet_services(id),
  combo_id text,
  customer_id text references vet_customers(id) on delete set null,
  pet_id text references vet_pets(id) on delete set null,
  customer_name text not null,
  phone text not null,
  pet_name text,
  date date not null,
  time text not null,
  duration_min int not null,
  price numeric(12,2),
  status text not null default 'pendiente' check (status in ('pendiente','confirmado','completado','cancelado','ausente')),
  notes text,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vet_appointments_date_idx on vet_appointments(date, time);

create table if not exists vet_waitlist (
  id text primary key,
  name text not null,
  phone text not null,
  pet_name text,
  service_id text references vet_services(id),
  preferred_date date,
  preferred_time text,
  notes text,
  status text not null default 'esperando',
  created_at timestamptz not null default now()
);

create table if not exists vet_carts (
  id text primary key,
  customer_id text references vet_customers(id) on delete cascade,
  name text,
  phone text,
  items jsonb not null default '[]',
  subtotal numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  recovered boolean not null default false,
  reminded_at timestamptz
);

create table if not exists vet_events (
  id text primary key,
  name text not null,
  props jsonb not null default '{}',
  session_id text,
  customer_id text,
  path text,
  at timestamptz not null default now()
);
create index if not exists vet_events_name_at_idx on vet_events(name, at desc);

create table if not exists vet_push_subscriptions (
  id bigserial primary key,
  customer_id text references vet_customers(id) on delete cascade,
  endpoint text unique not null,
  keys jsonb not null,
  kinds text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── Guardia: EMPLEADO puede cargar stock pero no cambiar precios ──
create or replace function vet_variant_prices(v jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e->'id', 'price', e->'price') order by e->>'id'), '[]'::jsonb)
  from jsonb_array_elements(coalesce(v, '[]'::jsonb)) e
$$;

create or replace function vet_products_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not vet_is_admin() then
    if new.price is distinct from old.price
       or new.compare_at_price is distinct from old.compare_at_price
       or vet_variant_prices(new.variants) is distinct from vet_variant_prices(old.variants) then
      raise exception 'Solo administración puede modificar precios';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists vet_products_guard on vet_products;
create trigger vet_products_guard before update on vet_products
for each row execute function vet_products_guard();

-- ─── RLS ────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'vet_staff','vet_categories','vet_products','vet_product_costs','vet_stock_movements','vet_services','vet_blocked_slots',
    'vet_combos','vet_coupons','vet_shipping_zones','vet_reviews','vet_faqs','vet_recommendation_rules','vet_settings',
    'vet_customers','vet_pets','vet_orders','vet_appointments','vet_waitlist','vet_carts','vet_events','vet_push_subscriptions'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Staff: lectura de su propio rol; ADMIN administra el equipo.
drop policy if exists vet_staff_self on vet_staff;
create policy vet_staff_self on vet_staff for select using (user_id = auth.uid() or vet_is_admin());
drop policy if exists vet_staff_admin on vet_staff;
create policy vet_staff_admin on vet_staff for all using (vet_is_admin()) with check (vet_is_admin());

-- Catálogo público: cualquiera lee lo visible/activo; ADMIN escribe.
drop policy if exists vet_categories_read on vet_categories;
create policy vet_categories_read on vet_categories for select using (visible or vet_is_staff());
drop policy if exists vet_categories_admin on vet_categories;
create policy vet_categories_admin on vet_categories for all using (vet_is_admin()) with check (vet_is_admin());

drop policy if exists vet_products_read on vet_products;
create policy vet_products_read on vet_products for select using (visible or vet_is_staff());
drop policy if exists vet_products_admin on vet_products;
create policy vet_products_admin on vet_products for all using (vet_is_admin()) with check (vet_is_admin());
-- EMPLEADO puede actualizar (stock); el trigger bloquea cambios de precio.
drop policy if exists vet_products_staff_update on vet_products;
create policy vet_products_staff_update on vet_products for update using (vet_is_staff()) with check (vet_is_staff());

drop policy if exists vet_product_costs_staff on vet_product_costs;
create policy vet_product_costs_staff on vet_product_costs for all using (vet_is_admin()) with check (vet_is_admin());

drop policy if exists vet_stock_movements_staff on vet_stock_movements;
create policy vet_stock_movements_staff on vet_stock_movements for all using (vet_is_staff()) with check (vet_is_staff());

drop policy if exists vet_services_read on vet_services;
create policy vet_services_read on vet_services for select using (visible or vet_is_staff());
drop policy if exists vet_services_admin on vet_services;
create policy vet_services_admin on vet_services for all using (vet_is_admin()) with check (vet_is_admin());

-- Los bloqueos se leen públicamente (para calcular horarios libres).
drop policy if exists vet_blocked_read on vet_blocked_slots;
create policy vet_blocked_read on vet_blocked_slots for select using (true);
drop policy if exists vet_blocked_staff on vet_blocked_slots;
create policy vet_blocked_staff on vet_blocked_slots for all using (vet_is_staff()) with check (vet_is_staff());

drop policy if exists vet_combos_read on vet_combos;
create policy vet_combos_read on vet_combos for select using (active or vet_is_staff());
drop policy if exists vet_combos_admin on vet_combos;
create policy vet_combos_admin on vet_combos for all using (vet_is_admin()) with check (vet_is_admin());

-- Cupones: el público solo ve los publicados; los códigos privados se validan en el servidor.
drop policy if exists vet_coupons_read on vet_coupons;
create policy vet_coupons_read on vet_coupons for select using ((active and public) or vet_is_staff());
drop policy if exists vet_coupons_admin on vet_coupons;
create policy vet_coupons_admin on vet_coupons for all using (vet_is_admin()) with check (vet_is_admin());

drop policy if exists vet_zones_read on vet_shipping_zones;
create policy vet_zones_read on vet_shipping_zones for select using (active or vet_is_staff());
drop policy if exists vet_zones_admin on vet_shipping_zones;
create policy vet_zones_admin on vet_shipping_zones for all using (vet_is_admin()) with check (vet_is_admin());

drop policy if exists vet_reviews_read on vet_reviews;
create policy vet_reviews_read on vet_reviews for select using (visible or vet_is_staff());
drop policy if exists vet_reviews_admin on vet_reviews;
create policy vet_reviews_admin on vet_reviews for all using (vet_is_admin()) with check (vet_is_admin());

drop policy if exists vet_faqs_read on vet_faqs;
create policy vet_faqs_read on vet_faqs for select using (visible or vet_is_staff());
drop policy if exists vet_faqs_admin on vet_faqs;
create policy vet_faqs_admin on vet_faqs for all using (vet_is_admin()) with check (vet_is_admin());

drop policy if exists vet_rules_read on vet_recommendation_rules;
create policy vet_rules_read on vet_recommendation_rules for select using (true);
drop policy if exists vet_rules_admin on vet_recommendation_rules;
create policy vet_rules_admin on vet_recommendation_rules for all using (vet_is_admin()) with check (vet_is_admin());

drop policy if exists vet_settings_read on vet_settings;
create policy vet_settings_read on vet_settings for select using (true);
drop policy if exists vet_settings_admin on vet_settings;
create policy vet_settings_admin on vet_settings for all using (vet_is_admin()) with check (vet_is_admin());

-- Clientes: cada cliente ve y edita su ficha; el staff ve todo; ADMIN borra.
drop policy if exists vet_customers_own on vet_customers;
create policy vet_customers_own on vet_customers for select using (user_id = auth.uid() or vet_is_staff());
drop policy if exists vet_customers_own_update on vet_customers;
create policy vet_customers_own_update on vet_customers for update using (user_id = auth.uid() or vet_is_staff()) with check (user_id = auth.uid() or vet_is_staff());
drop policy if exists vet_customers_insert on vet_customers;
create policy vet_customers_insert on vet_customers for insert with check (user_id = auth.uid() or vet_is_staff());
drop policy if exists vet_customers_delete on vet_customers;
create policy vet_customers_delete on vet_customers for delete using (vet_is_admin());

drop policy if exists vet_pets_own on vet_pets;
create policy vet_pets_own on vet_pets for all using (customer_id = vet_my_customer_id() or vet_is_staff()) with check (customer_id = vet_my_customer_id() or vet_is_staff());

-- Pedidos y turnos: el cliente ve los suyos; el staff gestiona. Alta vía API (service role).
drop policy if exists vet_orders_read on vet_orders;
create policy vet_orders_read on vet_orders for select using (customer_id = vet_my_customer_id() or vet_is_staff());
drop policy if exists vet_orders_staff on vet_orders;
create policy vet_orders_staff on vet_orders for all using (vet_is_staff()) with check (vet_is_staff());

drop policy if exists vet_appointments_read on vet_appointments;
create policy vet_appointments_read on vet_appointments for select using (customer_id = vet_my_customer_id() or vet_is_staff());
drop policy if exists vet_appointments_staff on vet_appointments;
create policy vet_appointments_staff on vet_appointments for all using (vet_is_staff()) with check (vet_is_staff());

drop policy if exists vet_waitlist_staff on vet_waitlist;
create policy vet_waitlist_staff on vet_waitlist for all using (vet_is_staff()) with check (vet_is_staff());

drop policy if exists vet_carts_own on vet_carts;
create policy vet_carts_own on vet_carts for all using (customer_id = vet_my_customer_id() or vet_is_staff()) with check (customer_id = vet_my_customer_id() or vet_is_staff());

-- Analíticas: cualquiera registra eventos; solo el staff los lee.
drop policy if exists vet_events_insert on vet_events;
create policy vet_events_insert on vet_events for insert with check (true);
drop policy if exists vet_events_staff on vet_events;
create policy vet_events_staff on vet_events for select using (vet_is_staff());

drop policy if exists vet_push_own on vet_push_subscriptions;
create policy vet_push_own on vet_push_subscriptions for all using (customer_id = vet_my_customer_id() or vet_is_staff()) with check (customer_id = vet_my_customer_id() or vet_is_staff());

-- Tiempo real para el panel (pedidos y turnos nuevos al instante).
do $$
begin
  begin
    alter publication supabase_realtime add table vet_orders, vet_appointments, vet_waitlist;
  exception when others then null;
  end;
end $$;

-- ─── Datos iniciales (categorías y servicios reales) ────────────────
insert into vet_categories (id, slug, name, description, icon, "order", visible, requires_consultation, consumable) values
  ('farmacia', 'farmacia-veterinaria', 'Farmacia veterinaria', 'Antiparasitarios, suplementos y medicamentos. Siempre con indicación profesional.', 'Pill', 1, true, true, true),
  ('higiene', 'higiene-y-peluqueria', 'Higiene y peluquería', 'Shampoos, cepillos, cortaúñas y todo para el cuidado diario.', 'Sparkles', 2, true, false, true),
  ('paseo', 'collares-arneses-y-correas', 'Collares, arneses y correas', 'Paseos cómodos y seguros para cada tamaño.', 'Footprints', 3, true, false, false),
  ('juguetes', 'juguetes', 'Juguetes', 'Peluches, pelotas e interactivos para perros y gatos.', 'Bone', 4, true, false, false),
  ('indumentaria', 'ropa-y-abrigos', 'Ropa y abrigos', 'Buzos, chalecos, polares y bandanas para todas las temporadas.', 'Shirt', 5, true, false, false),
  ('comederos', 'comederos-y-bebederos', 'Comederos y bebederos', 'Platos, dispensadores y botellas para paseo.', 'Soup', 6, true, false, false),
  ('descanso', 'hogar-y-descanso', 'Hogar y descanso', 'Camas, paños, rascadores y accesorios para la casa.', 'BedDouble', 7, true, false, false),
  ('transporte', 'transporte', 'Transporte', 'Bolsos y transportadoras para viajar tranquilos.', 'Luggage', 8, true, false, false),
  ('regalos', 'regalos-pet-lovers', 'Regalos pet lovers', 'Llaveros, bijouterie y deco para quienes aman a sus mascotas.', 'Gift', 9, true, false, false),
  ('otros', 'otros-accesorios', 'Otros accesorios', 'Productos del catálogo pendientes de revisión.', 'Package', 10, false, false, false)
on conflict (id) do nothing;

insert into vet_services (id, slug, kind, name, description, icon, duration_min, price, price_note, days, hours, capacity, species, visible, "order", repeat_every_days) values
  ('consulta', 'consulta-veterinaria', 'veterinaria', 'Consulta veterinaria', 'Control general, vacunas, desparasitación y consultas clínicas con profesionales.', 'Stethoscope', 30, null, null, '{1,2,3,4,5,6}', '[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:00"}]', 1, '{perro,gato,conejo,ave,pequenos}', true, 1, null),
  ('bano', 'bano', 'bano', 'Baño', 'Baño completo con productos adecuados para cada tipo de pelo y piel, secado y perfume.', 'ShowerHead', 60, null, 'Según tamaño y tipo de pelo', '{1,2,3,4,5,6}', '[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:00"}]', 1, '{perro,gato}', true, 2, 30),
  ('peluqueria', 'peluqueria-canina', 'peluqueria', 'Peluquería canina', 'Baño y corte según raza o a gusto, con terminación prolija y cuidado del bienestar.', 'Scissors', 90, null, 'Según tamaño, raza y estado del manto', '{1,2,3,4,5,6}', '[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:00"}]', 1, '{perro}', true, 3, 45),
  ('unas', 'corte-de-unas', 'unas', 'Corte de uñas', 'Corte y limado de uñas de forma segura y tranquila.', 'Hand', 15, null, null, '{1,2,3,4,5,6}', '[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:00"}]', 1, '{perro,gato,conejo,ave,pequenos}', true, 4, 30),
  ('deslanado', 'deslanado', 'deslanado', 'Deslanado', 'Retiro del subpelo muerto para razas de doble manto. Ideal en cambios de estación.', 'Wind', 90, null, 'Según tamaño y cantidad de subpelo', '{1,2,3,4,5}', '[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:00"}]', 1, '{perro,gato}', true, 5, 90),
  ('higiene', 'higiene', 'higiene', 'Higiene', 'Limpieza de oídos, zona de ojos, almohadillas y zonas sanitarias.', 'Sparkles', 30, null, null, '{1,2,3,4,5,6}', '[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:00"}]', 1, '{perro,gato}', true, 6, 30)
on conflict (id) do nothing;

insert into vet_shipping_zones (id, name, description, price, active, "order") values
  ('z1', 'Zona 1', 'Cercanías del local', null, true, 1),
  ('z2', 'Zona 2', 'Radio medio', null, true, 2),
  ('z3', 'Zona 3', 'Radio amplio', null, true, 3)
on conflict (id) do nothing;

insert into vet_faqs (id, question, answer, "order", visible) values
  ('f1', '¿Hacen envíos?', 'Sí. Al finalizar tu compra elegís envío a domicilio y tu zona; el costo y el horario se confirman antes de despachar. También podés retirar en el local.', 1, true),
  ('f2', '¿Cómo puedo reservar un turno?', 'Desde la sección Turnos elegís el servicio, tu mascota, el día y el horario. Te confirmamos por WhatsApp. Si no hay lugar, podés anotarte en la lista de espera.', 2, true),
  ('f3', '¿Qué medios de pago aceptan?', 'Efectivo, transferencia, Mercado Pago y tarjeta en el local. Elegís el medio al confirmar el pedido.', 3, true),
  ('f4', '¿Hacen baños?', 'Sí, hacemos baños con productos adecuados para cada tipo de pelo y piel. Reservá tu turno online.', 4, true),
  ('f5', '¿Hacen peluquería?', 'Sí, peluquería canina con baño y corte según raza o a gusto, además de deslanado, higiene y corte de uñas.', 5, true),
  ('f6', '¿Dónde están?', 'En la sección Ubicación vas a encontrar la dirección, el mapa y el botón «Cómo llegar».', 6, true),
  ('f7', '¿Cuánto demora un pedido?', 'Depende de la zona y de la disponibilidad. Te confirmamos el tiempo estimado por WhatsApp al recibir el pedido.', 7, true),
  ('f8', '¿Puedo retirar en el local?', 'Sí. Elegí «Retiro en el local» al finalizar la compra y te avisamos cuando esté listo.', 8, true),
  ('f9', '¿Puedo comprar medicamentos online?', 'Los productos de farmacia veterinaria se consultan con nuestro equipo antes de la venta, para indicarte la presentación y el uso adecuados para tu mascota.', 9, true)
on conflict (id) do nothing;

insert into vet_recommendation_rules (id, name, when_category_ids, when_tags, recommend_category_ids, recommend_product_ids, label, active) values
  ('rr1', 'Ropa → paseo', '{indumentaria}', '{}', '{paseo,juguetes}', '{}', 'Combiná con', true),
  ('rr2', 'Higiene → higiene y descanso', '{higiene}', '{shampoo,cepillo}', '{higiene,descanso}', '{}', 'Completá el cuidado', true),
  ('rr3', 'Paseo → comederos y juguetes', '{paseo}', '{}', '{comederos,juguetes}', '{}', 'Para el paseo', true),
  ('rr4', 'Juguetes → juguetes y snacks', '{juguetes}', '{}', '{juguetes,descanso}', '{}', 'También te puede interesar', true),
  ('rr5', 'Gatos → descanso e higiene', '{}', '{gato}', '{descanso,higiene}', '{}', 'Para tu gato', true)
on conflict (id) do nothing;

insert into vet_settings (id, data) values ('main', '{}') on conflict (id) do nothing;

-- Los productos se cargan con: node scripts/vet-import-catalog.mjs catalogo.xlsx
-- y luego ejecutando supabase/private/vet_catalog_import.sql (no versionado).
-- Para dar acceso de administración:
--   insert into vet_staff (user_id, role, name) values ('<uuid del usuario>', 'ADMIN', 'Dueña');

-- ─── Almacenamiento de imágenes (productos, mascotas, logo) ─────────
insert into storage.buckets (id, name, public) values ('vet-media', 'vet-media', true)
on conflict (id) do nothing;

drop policy if exists vet_media_read on storage.objects;
create policy vet_media_read on storage.objects for select using (bucket_id = 'vet-media');
-- Staff sube imágenes de productos y logo; clientes con sesión, fotos de sus mascotas.
drop policy if exists vet_media_staff_write on storage.objects;
create policy vet_media_staff_write on storage.objects for insert with check (
  bucket_id = 'vet-media' and (vet_is_staff() or (auth.uid() is not null and (storage.foldername(name))[1] = 'pets'))
);
drop policy if exists vet_media_staff_delete on storage.objects;
create policy vet_media_staff_delete on storage.objects for delete using (bucket_id = 'vet-media' and vet_is_staff());
