-- Order status emails.
-- Run after 004_payment_methods.sql. Safe to run more than once.
-- Needs the Edge Function and two Vault secrets to actually send: see docs/supabase.md.

-- Where update emails go. Null means the customer asked for none, and nothing
-- is sent. It is a snapshot: an order always mails the address given at
-- checkout, even if the account address changes later.
alter table public.orders
  add column if not exists contact_email text;

-- Catching a typo here beats discovering it when the confirmation bounces. The
-- same shape is checked in place_guest_order so the customer gets a readable
-- message instead of a constraint violation.
alter table public.orders
  drop constraint if exists orders_contact_email_shape;

alter table public.orders
  add constraint orders_contact_email_shape
    check (
      contact_email is null
      or contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    );

-- One row per (order, status) we have tried to mail about. The unique pair is
-- what keeps a status set twice from mailing the customer twice, and a row with
-- no sent_at is a failure staff can see without opening the provider dashboard.
create table if not exists public.order_emails (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  recipient text not null,
  provider_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, status)
);

-- Checkout now sends an optional email, which changes the signature.
drop function if exists public.place_guest_order(text, text, text, text, text, jsonb);

create or replace function public.place_guest_order(
  p_customer_name text,
  p_phone text,
  p_email text,
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
  resolved_email text;
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

  -- Guests type an address in; a signed-in customer already gave us one, and
  -- this function can read it where the browser cannot. Checkout only offers
  -- the field to guests, so a value here is always a deliberate choice.
  resolved_email := nullif(btrim(coalesce(p_email, '')), '');

  if resolved_email is null and owner is not null then
    select u.email into resolved_email
    from auth.users u
    where u.id = owner;
  end if;

  if resolved_email is not null
     and resolved_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email address does not look right';
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
    contact_email,
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
    resolved_email,
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

-- The Edge Function holds the Resend key, so Postgres has to reach out to it.
create extension if not exists pg_net;

create or replace function public.notify_order_status_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  fn_secret text;
begin
  if new.status is not distinct from old.status
     or new.status not in ('confirmed', 'out_for_delivery')
     or new.contact_email is null then
    return new;
  end if;

  -- Email is a courtesy; the order is the business. Nothing below may stop
  -- staff from moving an order along, so a broken or half-configured mail
  -- setup only warns. The Edge Function decides what actually gets sent.
  begin
    select decrypted_secret into fn_url
    from vault.decrypted_secrets
    where name = 'order_email_fn_url';

    select decrypted_secret into fn_secret
    from vault.decrypted_secrets
    where name = 'order_email_fn_secret';

    if fn_url is null or fn_secret is null then
      raise warning 'order email secrets are not set in Vault; skipping %', new.order_number;
      return new;
    end if;

    perform net.http_post(
      url := fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-starbloom-signature', fn_secret
      ),
      body := jsonb_build_object('order_id', new.id, 'status', new.status)
    );
  exception
    when others then
      raise warning 'order email dispatch failed for %: %', new.order_number, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists orders_notify_status_email on public.orders;

create trigger orders_notify_status_email
after update of status on public.orders
for each row
execute procedure public.notify_order_status_email();

alter table public.order_emails enable row level security;

revoke all on public.order_emails from public, anon, authenticated;

grant select on public.order_emails to authenticated;

grant execute on function public.place_guest_order(
  text, text, text, text, text, text, jsonb
) to anon, authenticated;

-- Only the Edge Function writes here, and it uses the service role key, which
-- is not subject to RLS.
drop policy if exists order_emails_staff_select on public.order_emails;

create policy order_emails_staff_select
  on public.order_emails
  for select
  to authenticated
  using (public.is_staff());
