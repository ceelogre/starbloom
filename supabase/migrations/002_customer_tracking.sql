-- Customer accounts + order tracking.
-- Run after 001_orders.sql. Staff must be promoted in profiles (see docs/supabase.md).

create type public.profile_role as enum ('customer', 'staff');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.profile_role not null default 'customer',
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

alter table public.orders
  add column if not exists customer_id uuid references auth.users (id) on delete set null;

create index if not exists orders_customer_id_idx on public.orders (customer_id);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'staff'
  );
$$;

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
  owner uuid := auth.uid();
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
    customer_id,
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
    owner,
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

alter table public.profiles enable row level security;

revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.place_guest_order(
  text, text, text, text, integer, integer, integer, integer, jsonb
) to anon, authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists orders_authenticated_select on public.orders;
drop policy if exists orders_authenticated_update on public.orders;
drop policy if exists order_items_authenticated_select on public.order_items;
drop policy if exists order_items_authenticated_update on public.order_items;

create policy orders_staff_select
  on public.orders
  for select
  to authenticated
  using (public.is_staff());

create policy orders_customer_select
  on public.orders
  for select
  to authenticated
  using (customer_id = auth.uid());

create policy orders_staff_update
  on public.orders
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy order_items_staff_select
  on public.order_items
  for select
  to authenticated
  using (public.is_staff());

create policy order_items_customer_select
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where public.orders.id = order_id
        and public.orders.customer_id = auth.uid()
    )
  );

create policy order_items_staff_update
  on public.order_items
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
