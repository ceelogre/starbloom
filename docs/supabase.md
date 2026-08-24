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

`001` creates `orders` / `order_items`, guest checkout RPC, and Realtime. `002` adds `profiles`, `orders.customer_id`, staff vs customer RLS, and attaches signed-in users to new orders. `003` adds the catalog (`products`, `product_variants`), stock tracking (`stock_movements`), and seeds the price menu.

If Realtime was already enabled for `orders`, a duplicate-publication error on `001` can be ignored.

## 2b. Inventory

Everything the shop sells comes from `products` and `product_variants`. A product is one item on the menu; a variant is one way to buy it (a box of 5 pieces, or by the kilo) with its own price and stock.

- Staff manage all of it at `/admin/inventory`. Products seeded by `003` start at **zero stock**, which reads as sold out in the shop, so restock before going live.
- Stock only moves through RPCs, and each move writes a `stock_movements` row: `place_guest_order` records a `sale`, `staff_cancel_order` records a `cancel_restore`, and `adjust_stock` records staff restocks, waste, and corrections.
- `place_guest_order` now takes only `variant_id` and `quantity` per line. Prices, VAT, and totals are read from `product_variants`, so a tampered browser cannot change what an order costs. The delivery fee and VAT rate are constants inside that function — change them there and in [`src/data/products.ts`](../src/data/products.ts) together.
- Orders are rejected when a tracked variant does not have enough stock, so overselling is not possible even with two customers checking out at once.
- Set `track_stock` to false on a variant that is always available (it then never blocks an order).

## 3. Auth

1. Authentication → Providers → **Email** enabled, including **magic links**.
2. **Allow new users to sign up** so customers can receive a first-time magic link. Do not add a staff sign-up form in the app.
3. Authentication → URL configuration:
   - Site URL: your app origin (e.g. `http://localhost:5173` in dev).
   - Redirect URLs: `{origin}/auth/callback` (and the production equivalent).
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
- Signed-in **customers** can `select` only rows where `customer_id = auth.uid()`. They cannot update orders.
- Signed-in **staff** can read and update status / payment / cancel reason. The app never deletes orders.
- A customer session must not reach the admin inbox (the app also checks `profiles.role`).
- Anyone may read **active** products and variants. Only staff can write to them or read `stock_movements`.

## 5. Realtime

Database → Replication (or Realtime) should include `public.orders` and `public.product_variants`. Inserts drive the admin badge, beep, and optional desktop notification. Customers subscribe to updates on their own orders.
