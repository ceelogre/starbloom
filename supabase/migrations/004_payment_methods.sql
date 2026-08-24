-- Payment method on orders.
-- Run after 003_inventory.sql.

-- Only 'cash_on_delivery' can take money today. The other values exist so the
-- checkout, the admin ticket, and the database share one vocabulary while the
-- rest is being set up.
create type public.payment_method as enum (
  'cash_on_delivery',
  'mobile_money',
  'card'
);

alter table public.orders
  add column if not exists payment_method public.payment_method
    not null default 'cash_on_delivery';

-- Checkout now sends the chosen method, which changes the signature.
drop function if exists public.place_guest_order(text, text, text, text, jsonb);

create or replace function public.place_guest_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_instructions text,
  p_payment_method text,
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
  -- Add a method here once it can actually charge.
  live_methods constant text[] := array['cash_on_delivery'];
  requested_method text;
  method public.payment_method;
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

  requested_method := coalesce(nullif(btrim(p_payment_method), ''), 'cash_on_delivery');

  -- Recording an order against a channel that cannot charge would send a driver
  -- out with goods nobody has paid for.
  if not (requested_method = any (live_methods)) then
    raise exception 'That payment method is not available yet';
  end if;

  method := requested_method::public.payment_method;

  new_number := public.next_order_number();

  insert into public.orders (
    order_number,
    customer_id,
    customer_name,
    phone,
    address,
    instructions,
    payment_method,
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
    method,
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

grant execute on function public.place_guest_order(text, text, text, text, text, jsonb) to anon, authenticated;
