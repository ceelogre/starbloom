-- Catalog + stock inventory.
-- Run after 002_customer_tracking.sql.

create type public.stock_reason as enum (
  'restock',
  'adjustment',
  'sale',
  'waste',
  'cancel_restore'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null check (category in ('meat', 'sausage')),
  name text not null,
  tag text check (tag in ('smoked', 'fresh')),
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  unit text not null check (unit in ('kg', 'box')),
  label text not null,
  pieces integer check (pieces is null or pieces > 0),
  price integer not null check (price >= 0),
  stock_quantity numeric not null default 0 check (stock_quantity >= 0),
  low_stock_at numeric not null default 0 check (low_stock_at >= 0),
  track_stock boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, unit)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta numeric not null,
  reason public.stock_reason not null,
  note text not null default '',
  order_id uuid references public.orders (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index products_category_idx on public.products (category, sort_order);
create index product_variants_product_id_idx on public.product_variants (product_id);
create index stock_movements_variant_id_idx on public.stock_movements (variant_id, created_at desc);

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants (id) on delete set null;

create index if not exists order_items_variant_id_idx on public.order_items (variant_id);

-- Boxes are the new sausage unit. 'pack' stays allowed so existing rows still validate.
alter table public.order_items drop constraint if exists order_items_unit_check;
alter table public.order_items
  add constraint order_items_unit_check check (unit in ('kg', 'pack', 'box'));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row
execute procedure public.touch_updated_at();

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row
execute procedure public.touch_updated_at();

-- Seed: the printed price menu plus the pork cuts already sold by the kilo.
insert into public.products (slug, category, name, tag, sort_order)
values
  ('spiced-smoked-beef-sausage', 'sausage', 'Spiced Smoked Beef Sausage', 'smoked', 1),
  ('smoked-pork-sausage', 'sausage', 'Smoked Pork Sausage', 'smoked', 2),
  ('cheese-sausage', 'sausage', 'Cheese Sausage', 'smoked', 3),
  ('non-spicy-smoked-sausage', 'sausage', 'Non-Spicy Smoked Sausage', 'smoked', 4),
  ('mixed-package', 'sausage', 'Mixed Package', 'smoked', 5),
  ('fresh-beef-sausage', 'sausage', 'Fresh Beef Sausage', 'fresh', 6),
  ('fresh-pork-sausage', 'sausage', 'Fresh Pork Sausage', 'fresh', 7),
  ('pork-ribs', 'meat', 'Pork ribs', null, 1),
  ('ham', 'meat', 'Ham', null, 2)
on conflict (slug) do nothing;

insert into public.product_variants (product_id, unit, label, pieces, price, sort_order)
select p.id, v.unit, v.label, v.pieces, v.price, v.sort_order
from public.products p
join (
  values
    ('spiced-smoked-beef-sausage', 'box', 'Box · 5 pcs', 5::integer, 10000::integer, 1::integer),
    ('spiced-smoked-beef-sausage', 'kg', 'Per kg', null, 14000, 2),
    ('smoked-pork-sausage', 'box', 'Box · 5 pcs', 5, 10000, 1),
    ('smoked-pork-sausage', 'kg', 'Per kg', null, 13000, 2),
    ('cheese-sausage', 'box', 'Box · 5 pcs', 5, 12000, 1),
    ('cheese-sausage', 'kg', 'Per kg', null, 18000, 2),
    ('non-spicy-smoked-sausage', 'box', 'Box · 5 pcs', 5, 10000, 1),
    ('non-spicy-smoked-sausage', 'kg', 'Per kg', null, 13000, 2),
    ('mixed-package', 'box', 'Box · 5 pcs', 5, 10000, 1),
    ('mixed-package', 'kg', 'Per kg', null, 15000, 2),
    ('fresh-beef-sausage', 'kg', 'Per kg', null, 15000, 1),
    ('fresh-pork-sausage', 'kg', 'Per kg', null, 13000, 1),
    ('pork-ribs', 'kg', 'Per kg', null, 8000, 1),
    ('ham', 'kg', 'Per kg', null, 8000, 1)
) as v (slug, unit, label, pieces, price, sort_order)
  on v.slug = p.slug
on conflict (product_id, unit) do nothing;

-- Staff adjust stock through this RPC so every change leaves a movement row.
create or replace function public.adjust_stock(
  p_variant_id uuid,
  p_delta numeric,
  p_reason text,
  p_note text default ''
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  current_qty numeric;
  next_qty numeric;
begin
  if not public.is_staff() then
    raise exception 'Only staff can change stock';
  end if;

  if p_reason not in ('restock', 'adjustment', 'waste') then
    raise exception 'Unsupported stock reason: %', p_reason;
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception 'Stock change cannot be zero';
  end if;

  select stock_quantity into current_qty
  from public.product_variants
  where id = p_variant_id
  for update;

  if current_qty is null then
    raise exception 'Unknown product variant';
  end if;

  next_qty := current_qty + p_delta;

  if next_qty < 0 then
    raise exception 'Stock cannot go below zero (have %, change %)', current_qty, p_delta;
  end if;

  update public.product_variants
  set stock_quantity = next_qty
  where id = p_variant_id;

  insert into public.stock_movements (variant_id, delta, reason, note, created_by)
  values (p_variant_id, p_delta, p_reason::public.stock_reason, coalesce(p_note, ''), auth.uid());

  return next_qty;
end;
$$;

-- Prices and totals now come from the catalog, so the client only sends
-- variant ids and quantities.
drop function if exists public.place_guest_order(
  text, text, text, text, integer, integer, integer, integer, jsonb
);

create or replace function public.place_guest_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_instructions text,
  p_items jsonb
)
returns table (id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  fee constant integer := 2000;
  vat constant numeric := 0.18;
  new_id uuid;
  new_number text;
  item jsonb;
  variant record;
  qty numeric;
  line integer;
  running_subtotal integer := 0;
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
    0,
    fee,
    0,
    fee
  )
  returning public.orders.id into new_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := (item ->> 'quantity')::numeric;

    if qty is null or qty <= 0 then
      raise exception 'Every line needs a quantity above zero';
    end if;

    if item ->> 'variant_id' is null then
      raise exception 'Every line needs a product';
    end if;

    select
      v.id,
      v.unit,
      v.label,
      v.price,
      v.stock_quantity,
      v.track_stock,
      p.category,
      p.slug,
      p.name
    into variant
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = (item ->> 'variant_id')::uuid
      and v.is_active
      and p.is_active
    for update of v;

    if variant.id is null then
      raise exception 'That product is no longer available';
    end if;

    if variant.track_stock and variant.stock_quantity < qty then
      raise exception '% is out of stock (% left)', variant.name, variant.stock_quantity;
    end if;

    line := round(variant.price * qty)::integer;
    running_subtotal := running_subtotal + line;

    insert into public.order_items (
      order_id,
      variant_id,
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
      variant.id,
      variant.category,
      variant.slug,
      variant.name,
      qty,
      variant.unit,
      variant.price,
      line
    );

    if variant.track_stock then
      update public.product_variants
      set stock_quantity = stock_quantity - qty
      where public.product_variants.id = variant.id;

      insert into public.stock_movements (variant_id, delta, reason, order_id)
      values (variant.id, -qty, 'sale', new_id);
    end if;
  end loop;

  update public.orders
  set subtotal = running_subtotal,
      vat_amount = round(running_subtotal * (vat / (1 + vat)))::integer,
      total = running_subtotal + fee
  where public.orders.id = new_id;

  return query select new_id, new_number;
end;
$$;

-- Cancelling puts reserved stock back.
create or replace function public.staff_cancel_order(
  p_order_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.order_status;
  line record;
begin
  if not public.is_staff() then
    raise exception 'Only staff can cancel orders';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A cancel reason is required';
  end if;

  select status into current_status
  from public.orders
  where id = p_order_id
  for update;

  if current_status is null then
    raise exception 'Unknown order';
  end if;

  if current_status = 'cancelled' then
    raise exception 'This order is already cancelled';
  end if;

  update public.orders
  set status = 'cancelled',
      cancelled_reason = btrim(p_reason)
  where id = p_order_id;

  for line in
    select oi.variant_id, oi.quantity
    from public.order_items oi
    join public.product_variants v on v.id = oi.variant_id
    where oi.order_id = p_order_id
      and v.track_stock
  loop
    update public.product_variants
    set stock_quantity = stock_quantity + line.quantity
    where id = line.variant_id;

    insert into public.stock_movements (variant_id, delta, reason, order_id, created_by)
    values (line.variant_id, line.quantity, 'cancel_restore', p_order_id, auth.uid());
  end loop;
end;
$$;

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.stock_movements enable row level security;

revoke all on public.products from public, anon, authenticated;
revoke all on public.product_variants from public, anon, authenticated;
revoke all on public.stock_movements from public, anon, authenticated;

grant select on public.products to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant insert, update on public.products to authenticated;
grant insert, update on public.product_variants to authenticated;
grant select on public.stock_movements to authenticated;

grant execute on function public.place_guest_order(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.adjust_stock(uuid, numeric, text, text) to authenticated;
grant execute on function public.staff_cancel_order(uuid, text) to authenticated;

-- Split by role: anon has no execute grant on is_staff().
create policy products_anon_select
  on public.products
  for select
  to anon
  using (is_active);

create policy products_authenticated_select
  on public.products
  for select
  to authenticated
  using (is_active or public.is_staff());

create policy products_staff_insert
  on public.products
  for insert
  to authenticated
  with check (public.is_staff());

create policy products_staff_update
  on public.products
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy product_variants_anon_select
  on public.product_variants
  for select
  to anon
  using (
    is_active
    and exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.is_active
    )
  );

create policy product_variants_authenticated_select
  on public.product_variants
  for select
  to authenticated
  using (
    public.is_staff()
    or (
      is_active
      and exists (
        select 1
        from public.products p
        where p.id = product_id
          and p.is_active
      )
    )
  );

create policy product_variants_staff_insert
  on public.product_variants
  for insert
  to authenticated
  with check (public.is_staff());

create policy product_variants_staff_update
  on public.product_variants
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy stock_movements_staff_select
  on public.stock_movements
  for select
  to authenticated
  using (public.is_staff());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_variants'
  ) then
    execute 'alter publication supabase_realtime add table public.product_variants';
  end if;
end $$;
