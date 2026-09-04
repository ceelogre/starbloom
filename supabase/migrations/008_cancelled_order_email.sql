-- Email the customer when staff cancel an order.
-- Run after 007_claim_guest_orders.sql. Safe to run more than once.
-- Replaces the status-email trigger body from 005; no new secrets.

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
     or new.status not in ('confirmed', 'out_for_delivery', 'cancelled')
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
