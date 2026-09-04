# Supabase setup (Starbloom orders)

Never put the **service role** key in the Vite app. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` belong in the frontend.

## 1. Create a project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public** key into `.env` (see `.env.example`).
3. Restart `npm run dev` after changing env vars.

## 2. Run the migrations

In the SQL editor, run in order:

1. [`supabase/migrations/001_orders.sql`](../supabase/migrations/001_orders.sql)
2. [`supabase/migrations/002_customer_tracking.sql`](../supabase/migrations/002_customer_tracking.sql)
3. [`supabase/migrations/003_inventory.sql`](../supabase/migrations/003_inventory.sql)
4. [`supabase/migrations/004_payment_methods.sql`](../supabase/migrations/004_payment_methods.sql)
5. [`supabase/migrations/005_order_email_notifications.sql`](../supabase/migrations/005_order_email_notifications.sql)
6. [`supabase/migrations/006_support_inquiries.sql`](../supabase/migrations/006_support_inquiries.sql)
7. [`supabase/migrations/007_claim_guest_orders.sql`](../supabase/migrations/007_claim_guest_orders.sql)
8. [`supabase/migrations/008_cancelled_order_email.sql`](../supabase/migrations/008_cancelled_order_email.sql)

`001` creates `orders` / `order_items`, guest checkout RPC, and Realtime. `002` adds `profiles`, `orders.customer_id`, staff vs customer RLS, and attaches signed-in users to new orders. `003` adds the catalog (`products`, `product_variants`), stock tracking (`stock_movements`), and seeds the price menu. `004` adds `orders.payment_method`. `005` adds `orders.contact_email`, the `order_emails` log, and the trigger that asks the Edge Function to send status emails. `006` adds `support_inquiries`, the public contact-form RPC, and the trigger that asks a second Edge Function to email staff. `007` lets a signed-in customer attach guest orders placed with the same email (`claim_guest_orders`), so Track order shows the checkout they just finished. `008` also emails the customer when staff cancel an order.

If Realtime was already enabled for `orders`, a duplicate-publication error on `001` can be ignored.

`004` is safe to run more than once: it guards each step, and it rebuilds the `payment_method` type if that type holds labels which are no longer live.

`005` is safe to run more than once, but it does nothing on its own — until section 6 is done, the trigger it installs finds no Vault secrets and only writes a warning.

`006` is the same: the contact form still saves without mail setup, and the trigger only warns until section 7 is done.

`008` is safe to run more than once. Redeploy `order-status-email` after it so the function accepts `cancelled`.

## 2b. Inventory

Everything the shop sells comes from `products` and `product_variants`. A product is one item on the menu; a variant is one way to buy it (a box of 5 pieces, or by the kilo) with its own price and stock.

- Staff manage all of it at `/admin/inventory`. Products seeded by `003` start at **zero stock**, which reads as sold out in the shop, so restock before going live.
- Stock only moves through RPCs, and each move writes a `stock_movements` row: `place_guest_order` records a `sale`, `staff_cancel_order` records a `cancel_restore`, and `adjust_stock` records staff restocks, waste, and corrections.
- `place_guest_order` now takes only `variant_id` and `quantity` per line. Prices, VAT, and totals are read from `product_variants`, so a tampered browser cannot change what an order costs. The delivery fee and VAT rate are constants inside that function — change them there and in [`src/data/products.ts`](../src/data/products.ts) together.
- Orders are rejected when a tracked variant does not have enough stock, so overselling is not possible even with two customers checking out at once.
- Set `track_stock` to false on a variant that is always available (it then never blocks an order).

## 2c. Payment methods

`orders.payment_method` records how a customer chose to pay. The `payment_method` enum only carries methods that can actually take money, so today it holds `cash_on_delivery` alone and `place_guest_order` refuses anything else — a tampered browser cannot file an order as prepaid by card.

Checkout also lists mobile money and card under "Coming soon". Those are copy in `UPCOMING_PAYMENT_METHODS` ([`src/lib/payment.ts`](../src/lib/payment.ts)) and cannot be selected or stored. Turning one on takes two steps:

```sql
alter type public.payment_method add value 'mobile_money';
```

then move its entry into `PAYMENT_METHODS` and give it a label in `PAYMENT_METHOD_LABELS`. The RPC accepts whatever the enum knows, so the migration is what makes a method live.

`payment_method` is what the customer chose; `payment_status` is whether the money arrived. Staff still mark an order paid by hand at `/admin/orders/:id`.

## 3. Auth

1. Authentication → Providers → **Email** enabled, including **magic links**.
2. **Allow new users to sign up** so customers can receive a first-time magic link. Do not add a staff sign-up form in the app.
3. Authentication → URL configuration:
   - Site URL: your app origin (e.g. `http://localhost:5173` in dev).
   - Redirect URLs: `{origin}/auth/callback` (and the production equivalent). A `?next=` query is appended after login; you do not need a separate allow-list entry for it.
4. Authentication → Users → **Add user** with email + password for 1–2 staff accounts.
5. Promote staff in SQL (magic-link users stay `customer` by default):

```sql
update public.profiles
set role = 'staff'
where id = '<auth user uuid>';
```

Existing auth users get a `profiles` row when `002` runs. New sign-ins get a row from the `on_auth_user_created` trigger.

## 4. Confirm RLS

- Guest checkout uses the anon key and `place_guest_order`. Anon must **not** be able to list orders.
- Signed-in **customers** can `select` only rows where `customer_id = auth.uid()`. They cannot update orders. Guest rows with a matching `contact_email` are attached by the `claim_guest_orders` RPC after magic-link (migration `007`).
- Signed-in **staff** can read and update status / payment / cancel reason. The app never deletes orders.
- A customer session must not reach the admin inbox (the app also checks `profiles.role`).
- Anyone may read **active** products and variants. Only staff can write to them or read `stock_movements`.
- Only staff can read `order_emails`. Nobody writes to it through the API: the Edge Function uses the service role key.
- Guest contact uses the anon key and `submit_support_inquiry`. Anon must **not** be able to list inquiries. Only staff can read them or update `status`.

## 5. Realtime

Database → Replication (or Realtime) should include `public.orders`, `public.product_variants`, and `public.support_inquiries`. Inserts drive the admin badge, beep, and optional desktop notification. Customers subscribe to updates on their own orders.

## 6. Order emails

Customers get an email when an order is marked **confirmed**, **out for delivery**, or **cancelled**. The address is optional: guests are offered a field at checkout, signed-in customers get the address on their account, and an order with no address is simply skipped. Support inquiries are a separate mail path (section 7).

The path is `orders.status` update → `orders_notify_status_email` trigger → `net.http_post` → the [`order-status-email`](../supabase/functions/order-status-email/index.ts) Edge Function → Resend. The trigger only asks; the function decides and records. Postgres cannot hold the Resend key, and the browser cannot read another customer's email out of `auth.users`, which is why this lives in a function rather than in the app.

Email is a courtesy and the order is the business, so the trigger swallows its own failures: if any of the setup below is missing or broken, staff can still move orders along and Postgres only logs a warning.

### 6a. Resend

1. Add and verify a sending domain at [resend.com](https://resend.com).
2. Create an API key.

### 6b. Deploy the function

```bash
npx supabase login
npx supabase link --project-ref <ref>

npx supabase secrets set \
  RESEND_API_KEY=re_... \
  ORDER_EMAIL_FROM='Starbloom <orders@your-domain.com>' \
  ORDER_EMAIL_SECRET="$(openssl rand -hex 32)" \
  PUBLIC_SITE_URL=https://your-app-origin

npm run functions:deploy
```

`ORDER_EMAIL_SECRET` is the only thing guarding the function: it is deployed with `verify_jwt = false` (pg_net carries no user JWT), and it rejects any request whose `x-starbloom-signature` header does not match. Generate a fresh random value and keep it. `PUBLIC_SITE_URL` is optional and only used for the "Track this order" link.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform. Do not set them by hand, and never copy the service role key into `.env`.

### 6c. Tell Postgres where to knock

Two secrets in Vault, set once in the SQL editor. The second must be the **same value** you gave `ORDER_EMAIL_SECRET` above.

```sql
select vault.create_secret(
  'https://<ref>.functions.supabase.co/order-status-email',
  'order_email_fn_url'
);
select vault.create_secret('<same value as ORDER_EMAIL_SECRET>', 'order_email_fn_secret');
```

To rotate one later, use `vault.update_secret` rather than creating a second row with the same name.

Confirm `pg_net` shows as enabled under Database → Extensions. `005` enables it, but the toggle is worth checking.

### 6d. Checking and debugging

Every attempt writes a row to `public.order_emails`, one per order and status. The unique pair is what stops a status set twice from mailing the customer twice; a row with no `sent_at` is a failure. Staff see the same thing in plain English at the bottom of `/admin/orders/:id`.

```sql
-- What we tried to send, and whether it landed.
select order_id, status, recipient, sent_at, error
from public.order_emails
order by created_at desc
limit 20;

-- Did the request reach the function at all? (401 means the two secrets differ.)
select id, status_code, content, created
from net._http_response
order by created desc
limit 10;
```

A failed row keeps its claim, so it will not retry on its own. Delete the row and set the status again to have another go:

```sql
delete from public.order_emails where order_id = '<uuid>' and status = 'confirmed';
```

Bounces, spam complaints and per-message delivery detail live in the Resend dashboard; `order_emails.provider_id` is the message id to search for.

## 7. Support emails

A message from `/contact` lands in `support_inquiries` and in `/admin/support` whether mail is set up or not. When it is, staff also get an email they can reply to (Resend `reply_to` is the customer).

The path is insert → `support_inquiries_notify_email` trigger → `net.http_post` → the [`support-inquiry-email`](../supabase/functions/support-inquiry-email/index.ts) Edge Function → Resend. It reuses the order-email Resend key, from-address, and `ORDER_EMAIL_SECRET`. Failures are swallowed the same way as order mail: a missing secret only warns, and the inquiry still saves.

### 7a. Extra secrets

After the order-email deploy in 6b, set the staff inbox and redeploy both functions:

```bash
npx supabase secrets set SUPPORT_INBOX_EMAIL=you@your-domain.com

npm run functions:deploy
```

`SUPPORT_INBOX_EMAIL` is who receives contact-form mail. `ORDER_EMAIL_FROM` is still the from-address.

### 7b. Tell Postgres where to knock

One extra Vault secret, next to the two from 6c. The function URL is different; the signature is the **same** `ORDER_EMAIL_SECRET` already stored as `order_email_fn_secret`.

```sql
select vault.create_secret(
  'https://<ref>.functions.supabase.co/support-inquiry-email',
  'support_email_fn_url'
);
```

### 7c. Checking

Staff see send status at the bottom of `/admin/support/:id`. The same fields live on the inquiry row:

```sql
select id, email, email_sent_at, email_error, email_provider_id
from public.support_inquiries
order by created_at desc
limit 20;
```

A row with `email_sent_at` set will not mail again. To retry a failure, clear the stamp and call the function (or re-run the HTTP request from `net._http_response`):

```sql
update public.support_inquiries
set email_sent_at = null, email_error = null, email_provider_id = null
where id = '<uuid>';
```

