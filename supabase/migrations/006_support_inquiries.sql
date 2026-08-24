-- Support inquiries from the public contact form.
-- Run after 005_order_email_notifications.sql. Safe to run more than once.
-- Staff notification email needs the Edge Function and Vault secrets: see docs/supabase.md.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'inquiry_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.inquiry_status as enum ('new', 'read', 'closed');
  end if;
end $$;

create table if not exists public.support_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  message text not null,
  status public.inquiry_status not null default 'new',
  customer_id uuid references auth.users (id) on delete set null,
  email_provider_id text,
  email_error text,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_inquiries
  drop constraint if exists support_inquiries_email_shape;

alter table public.support_inquiries
  add constraint support_inquiries_email_shape
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

alter table public.support_inquiries
  drop constraint if exists support_inquiries_name_length;

alter table public.support_inquiries
  add constraint support_inquiries_name_length
    check (char_length(name) between 1 and 200);

alter table public.support_inquiries
  drop constraint if exists support_inquiries_phone_length;

alter table public.support_inquiries
  add constraint support_inquiries_phone_length
    check (char_length(phone) <= 40);

alter table public.support_inquiries
  drop constraint if exists support_inquiries_message_length;

alter table public.support_inquiries
  add constraint support_inquiries_message_length
    check (char_length(message) between 1 and 4000);

create index if not exists support_inquiries_created_at_idx
  on public.support_inquiries (created_at desc);

create index if not exists support_inquiries_status_idx
  on public.support_inquiries (status);

drop trigger if exists support_inquiries_set_updated_at on public.support_inquiries;

create trigger support_inquiries_set_updated_at
before update on public.support_inquiries
for each row
execute procedure public.touch_updated_at();

create or replace function public.submit_support_inquiry(
  p_name text,
  p_email text,
  p_phone text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_name text;
  resolved_email text;
  resolved_phone text;
  resolved_message text;
  new_id uuid;
begin
  resolved_name := btrim(coalesce(p_name, ''));
  resolved_email := btrim(coalesce(p_email, ''));
  resolved_phone := btrim(coalesce(p_phone, ''));
  resolved_message := btrim(coalesce(p_message, ''));

  if resolved_name = '' then
    raise exception 'Name is required';
  end if;
  if char_length(resolved_name) > 200 then
    raise exception 'Name is too long';
  end if;
  if resolved_email = '' then
    raise exception 'Email is required';
  end if;
  if resolved_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email address does not look right';
  end if;
  if char_length(resolved_phone) > 40 then
    raise exception 'Phone number is too long';
  end if;
  if resolved_message = '' then
    raise exception 'Message is required';
  end if;
  if char_length(resolved_message) > 4000 then
    raise exception 'Message is too long';
  end if;

  insert into public.support_inquiries (
    name,
    email,
    phone,
    message,
    customer_id
  )
  values (
    resolved_name,
    resolved_email,
    resolved_phone,
    resolved_message,
    auth.uid()
  )
  returning public.support_inquiries.id into new_id;

  return new_id;
end;
$$;

create or replace function public.notify_support_inquiry_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  fn_secret text;
begin
  -- Email is a courtesy; the inquiry is the record. A missing or broken mail
  -- setup only warns, so the contact form still succeeds.
  begin
    select decrypted_secret into fn_url
    from vault.decrypted_secrets
    where name = 'support_email_fn_url';

    select decrypted_secret into fn_secret
    from vault.decrypted_secrets
    where name = 'order_email_fn_secret';

    if fn_url is null or fn_secret is null then
      raise warning 'support email secrets are not set in Vault; skipping inquiry %', new.id;
      return new;
    end if;

    perform net.http_post(
      url := fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-starbloom-signature', fn_secret
      ),
      body := jsonb_build_object('inquiry_id', new.id)
    );
  exception
    when others then
      raise warning 'support email dispatch failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists support_inquiries_notify_email on public.support_inquiries;

create trigger support_inquiries_notify_email
after insert on public.support_inquiries
for each row
execute procedure public.notify_support_inquiry_email();

alter table public.support_inquiries enable row level security;

revoke all on public.support_inquiries from public, anon, authenticated;

grant select on public.support_inquiries to authenticated;
grant update (status) on public.support_inquiries to authenticated;
grant execute on function public.submit_support_inquiry(text, text, text, text) to anon, authenticated;

drop policy if exists support_inquiries_staff_select on public.support_inquiries;
drop policy if exists support_inquiries_staff_update on public.support_inquiries;

create policy support_inquiries_staff_select
  on public.support_inquiries
  for select
  to authenticated
  using (public.is_staff());

create policy support_inquiries_staff_update
  on public.support_inquiries
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_inquiries'
  ) then
    execute 'alter publication supabase_realtime add table public.support_inquiries';
  end if;
end $$;
