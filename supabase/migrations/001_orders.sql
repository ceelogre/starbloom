-- Starbloom guest orders + staff operations.
-- Run in the Supabase SQL editor (or via the CLI) after creating the project.

create extension if not exists pgcrypto;

create type public.order_status as enum (
  'new',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

create type public.payment_status as enum (
  'unpaid',
  'paid'
);

create table public.order_number_seq (
  day date primary key,
  seq integer not null default 0
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status public.order_status not null default 'new',
  payment_status public.payment_status not null default 'unpaid',
  customer_name text not null,
  phone text not null,
  address text not null,
  instructions text not null default '',
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  vat_amount integer not null check (vat_amount >= 0),
  total integer not null check (total >= 0),
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  category text not null check (category in ('meat', 'sausage')),
  product_id text,
  product_name text,
  quantity numeric not null check (quantity > 0),
  unit text not null check (unit in ('kg', 'pack')),
  unit_price integer not null check (unit_price >= 0),
  line_total integer not null check (line_total >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_phone_idx on public.orders (phone);

create or replace function public.next_order_number()
returns text
language plpgsql
as $$
declare
  d date := (timezone('Africa/Kigali', now()))::date;
  n integer;
begin
  insert into public.order_number_seq (day, seq)
  values (d, 1)
  on conflict (day) do update
    set seq = public.order_number_seq.seq + 1
  returning seq into n;

  return 'SB-' || to_char(d, 'YYMMDD') || '-' || lpad(n::text, 3, '0');
end;
$$;

create or replace function public.set_order_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute procedure public.set_order_timestamps();

-- Guest checkout cannot SELECT under RLS, so RETURNING would fail.
-- This SECURITY DEFINER RPC inserts the order and returns the number.
create or replace function public.place_guest_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_instructions text,
  p_subtotal integer,
  p_delivery_fee integer,
  p_vat_amount integer,
  p_total integer,
  p_items jsonb
)
returns table (id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  new_number text;
  item jsonb;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Customer name is required';
  end if;
  if p_phone is null or btrim(p_phone) = '' then
    raise exception 'Phone is required';
  end if;
  if p_address is null or btrim(p_address) = '' then
    raise exception 'Address is required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must include at least one item';
  end if;

  new_number := public.next_order_number();

  insert into public.orders (
    order_number,
    customer_name,
    phone,
    address,
    instructions,
    subtotal,
    delivery_fee,
    vat_amount,
    total
  )
  values (
    new_number,
    btrim(p_customer_name),
    btrim(p_phone),
    btrim(p_address),
    coalesce(p_instructions, ''),
    p_subtotal,
    p_delivery_fee,
    p_vat_amount,
    p_total
  )
  returning public.orders.id into new_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      category,
      product_id,
      product_name,
      quantity,
      unit,
      unit_price,
      line_total
    )
    values (
      new_id,
      item ->> 'category',
      item ->> 'product_id',
      item ->> 'product_name',
      (item ->> 'quantity')::numeric,
      item ->> 'unit',
      (item ->> 'unit_price')::integer,
      (item ->> 'line_total')::integer
    );
  end loop;

  return query select new_id, new_number;
end;
$$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_number_seq enable row level security;

revoke all on public.orders from public, anon, authenticated;
revoke all on public.order_items from public, anon, authenticated;
revoke all on public.order_number_seq from public, anon, authenticated;

grant insert on public.orders to anon;
grant select, update on public.orders to authenticated;

grant insert on public.order_items to anon;
grant select, update on public.order_items to authenticated;

grant execute on function public.place_guest_order(
  text, text, text, text, integer, integer, integer, integer, jsonb
) to anon, authenticated;

create policy orders_anon_insert
  on public.orders
  for insert
  to anon
  with check (true);

create policy orders_authenticated_select
  on public.orders
  for select
  to authenticated
  using (true);

create policy orders_authenticated_update
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

create policy order_items_anon_insert
  on public.order_items
  for insert
  to anon
  with check (true);

create policy order_items_authenticated_select
  on public.order_items
  for select
  to authenticated
  using (true);

create policy order_items_authenticated_update
  on public.order_items
  for update
  to authenticated
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
end $$;
