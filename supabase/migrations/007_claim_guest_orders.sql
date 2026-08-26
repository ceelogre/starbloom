-- Attach guest orders to the signed-in customer when the checkout email matches.
-- Customers cannot UPDATE orders via RLS, so this must be a security-definer RPC.
-- Guests who left no email still track by order number / phone; this does not invent SMS.

create or replace function public.claim_guest_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer := 0;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  user_email := nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
  if user_email is null then
    select nullif(lower(trim(email)), '')
    into user_email
    from auth.users
    where id = auth.uid();
  end if;
  if user_email is null then
    return 0;
  end if;

  update public.orders
  set customer_id = auth.uid()
  where customer_id is null
    and contact_email is not null
    and lower(trim(contact_email)) = user_email;

  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

revoke all on function public.claim_guest_orders() from public, anon;
grant execute on function public.claim_guest_orders() to authenticated;
