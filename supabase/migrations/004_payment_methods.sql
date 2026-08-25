-- Payment method on orders.
-- Run after 003_inventory.sql. Safe to run more than once.

-- The enum only carries methods that can actually take money. Checkout also
-- advertises mobile money and card, but those are copy in src/lib/payment.ts
-- until there is something behind them: add the value here when one goes live.
do $$
begin
  if to_regtype('public.payment_method') is null then
    create type public.payment_method as enum ('cash_on_delivery');
  end if;
end $$;

alter table public.orders
  add column if not exists payment_method public.payment_method
    not null default 'cash_on_delivery';

-- An earlier draft of this file listed mobile_money and card in the enum, and
-- Postgres cannot drop an enum value. The guard in place_guest_order below is
-- the cast to this type, so a label the type still knows is one it would accept
-- — rebuild the type to take those away. No order can hold a dropped label,
-- because the RPC has always refused them, so the cast back cannot lose data.
do $$
begin
  if exists (
    select 1
    from pg_enum
    where enumtypid = 'public.payment_method'::regtype
      and enumlabel <> 'cash_on_delivery'
  ) then
    alter table public.orders alter column payment_method drop default;

    alter table public.orders
      alter column payment_method type text using payment_method::text;

    drop type public.payment_method;
    create type public.payment_method as enum ('cash_on_delivery');

    alter table public.orders
      alter column payment_method type public.payment_method
        using payment_method::public.payment_method;

    alter table public.orders
      alter column payment_method set default 'cash_on_delivery';
  end if;
end $$;

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

  -- A method the enum does not know cannot charge, and filing the order anyway
  -- would send a driver out expecting someone else to have collected. The cast
  -- does the checking; this only trades its message for one a customer can read.
  begin
    method := requested_method::public.payment_method;
  exception
    when invalid_text_representation then
      raise exception 'That payment method is not available yet';
  end;

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
