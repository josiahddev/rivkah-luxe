# Rivkah Luxe — online store

A complete e-commerce site for **Rivkah Luxe** (luxury body care, HQ in Canada, shipping worldwide): a customer storefront, Stripe + Paystack checkout, and a plain-language admin dashboard the owner runs without code.

- **Storefront:** home, shop, categories, collections, product pages (variants, gallery, reviews), search, wishlist, bag, checkout, order tracking, customer accounts, About/Contact/FAQ, and editable policy pages.
- **Payments:** Stripe (CAD, USD, and other card currencies, plus Apple Pay and Google Pay) and Paystack (NGN). Every payment is **verified on the server** through the provider's API and webhooks before an order is marked paid.
- **Admin (`/admin`):**
  - **Selling:** orders, products, stock, categories and collections, customers.
  - **Marketing:** discount codes, promotions, reviews, email subscribers, sales reports with charts, abandoned bags.
  - **Website:** content (homepage, pages, FAQ), a photo library, contact messages.
  - **Setup:** shipping zones, settings (currencies, provincial tax, payments, SEO), team roles, activity log, notifications, in-app help, and a first-time setup guide.

> The owner's step-by-step manual is in **[OWNER_GUIDE.md](OWNER_GUIDE.md)**.

---

## Tech stack

| Part | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4, Cormorant Garamond + Jost fonts |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Own session system: bcrypt passwords, hashed session tokens in httpOnly cookies, role permissions |
| Payments | Stripe Checkout (`stripe`), Paystack REST API |
| Email | Any SMTP provider (Nodemailer) |
| Images | Vercel Blob in production (`/public/uploads` locally), resized with `sharp` |
| Charts | Recharts · Rich text: Tiptap |
| Hosting | Vercel |

## Project structure

```
prisma/
  schema.prisma        All tables (products, variants, orders, payments, coupons, reviews, content, …)
  seed.ts              Store settings, pages, FAQ, shipping zones + clearly-marked DEMO data
  demo-images.ts       Which demo photo goes with which demo product
scripts/
  create-admin.ts      npm run admin:create — add/reset a dashboard account
  remove-demo.ts       npm run db:remove-demo — delete all demo data before launch
  refresh-demo-images.ts / render-products.mjs — demo product imagery (bottles with the brand labels)
assets/labels/         Original label artwork used for the demo product renders
public/demo/           Demo images (replace with real photography in the dashboard)
public/payments/       Payment brand marks (Visa, Mastercard, Amex, Apple Pay, Google Pay, Paystack)
src/
  app/(store)/         Customer pages
  app/admin/           Dashboard (login, panel pages, printable invoice)
  app/api/             Webhooks (Stripe, Paystack), admin upload/media/subscriber export
  components/store|admin|ui/
  lib/                 Business logic: pricing, cart, orders, payments, currency, settings, auth, email, storage, analytics
  server/              Server Actions (storefront + admin/*)
  proxy.ts             Optimistic redirect for signed-out /admin and /account visits
```

How it fits together:
- **Prices** are stored in **cents of the base currency (CAD)**. `lib/pricing.ts` converts to the shopper's currency line by line, works out shipping (by country, plus optional province/state) and tax (by Canadian province), and applies coupons. **All totals are calculated on the server.** The browser never sends prices.
- **Checkout** (`lib/orders.ts`): it re-checks every item (exists, published, in stock, current price, valid coupon and shipping zone), creates a `PENDING` order, then sends the shopper to Stripe or Paystack. `confirmPayment()` checks the payment with the provider's API, compares the amount and currency, marks the order paid (only once, even if the redirect and the webhook both arrive), reduces stock, records coupon use, empties the bag, emails the customer and notifies the owner.
- **Admin security:** every admin page and action calls `requireAdmin(permission)` on the server. Roles are **Owner (SUPER_ADMIN)**, **Store Manager** and **Content Manager** (see `lib/auth/permissions.ts`).

---

## 1. Run it locally

Requirements: **Node.js 20.9+** (tested on 24).

```bash
npm install
cp .env.example .env          # then fill it in (see below)
npx prisma dev --name rivkah --detach   # starts a local Postgres; copy the TCP URL it prints into DATABASE_URL
npx prisma migrate dev        # creates the tables
npm run db:seed               # settings, pages, shipping zones + demo products/orders
npm run dev                   # http://localhost:3000
```

On later days, start the local database again with `npm run db:dev`.

- Storefront: `http://localhost:3000`
- Dashboard: `http://localhost:3000/admin/login` — sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`.
- To try checkout without payment keys, set `PAYMENT_TEST_MODE="true"`. A "Test payment" page lets you simulate success, failure or cancel. **This is disabled in production builds.**

## 2. Environment variables

All of them are listed with comments in **[.env.example](.env.example)**. Never commit `.env`; it's git-ignored.

| Variable | Required | What it's for |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. Optional `?schema=name`. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public URL, e.g. `https://www.rivkahluxe.com` (emails, payment redirects, sitemap) |
| `AUTH_SECRET` | ✅ | Random 32+ characters (`openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | for cards | Stripe Dashboard → Developers |
| `PAYSTACK_SECRET_KEY` | for NGN | Paystack Dashboard → Settings → API Keys |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `EMAIL_FROM` | for emails | Any SMTP service |
| `BLOB_READ_WRITE_TOKEN` | in production | Vercel → Storage → Blob |
| `NEXT_PUBLIC_STORE_TIMEZONE` | optional | Defaults to `America/Toronto` |
| `PAYMENT_TEST_MODE` | dev only | `"true"` to simulate payments locally |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | first setup | Creates the owner account when seeding |

Secret keys are only read on the server and are never sent to the browser. The dashboard shows *whether* each service is connected, never the keys themselves.

## 3. Database

- **Production:** any managed Postgres, such as [Neon](https://neon.tech), Supabase, Vercel Postgres or Prisma Postgres. Use the **pooled** connection string for `DATABASE_URL`.
- **Migrations:** `npx prisma migrate dev --name <change>` locally; `npm run db:migrate` (`prisma migrate deploy`) in production. This runs automatically in the `vercel-build` script.
- **Demo data:** everything the seed creates for demonstration is flagged `isDemo` (customers use `@example.com` emails). Before launch run:

  ```bash
  npm run db:remove-demo
  ```

  It keeps settings, categories, pages, FAQ and shipping zones.

## 4. Payments

**Stripe** (CAD, USD, GBP, EUR, AUD and other card currencies):
1. Create a Stripe account for the Canadian business and copy the **Secret key** into `STRIPE_SECRET_KEY`. Use `sk_test_…` first.
2. Developers → Webhooks → Add endpoint: `https://YOUR-DOMAIN/api/webhooks/stripe`, with these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`

   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. To test locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, using card `4242 4242 4242 4242`.

**Paystack** (NGN):
1. Copy the **Secret key** into `PAYSTACK_SECRET_KEY`. Paystack needs a business registered in Nigeria, Ghana, South Africa or Kenya; if there isn't one, naira prices fall back to Stripe in CAD.
2. Settings → API Keys & Webhooks → Webhook URL: `https://YOUR-DOMAIN/api/webhooks/paystack`.

**Which provider charges an order?** NGN orders go to Paystack; everything else goes to Stripe. If a currency isn't supported by any connected provider, the customer is charged in CAD (checkout tells them). Exchange rates are set by the owner under **Settings → Currencies**.

## 5. Email

Set the `SMTP_*` variables. Good options are [Resend](https://resend.com) (SMTP host `smtp.resend.com`, port 465, user `resend`, password = API key), Postmark, Zoho or Google Workspace. Verify your sending domain (SPF/DKIM) with the provider.

Emails sent:
- **To customers:** welcome, order confirmation, payment confirmation, each status update (processing, packed, shipped, out for delivery, delivered, cancelled, refunded), password reset, and the contact-form acknowledgement.
- **To the owner:** new-order and new-message alerts.

Every attempt is logged in the `EmailLog` table. Without SMTP set up, emails are logged as `NOT_CONFIGURED` and checkout still works.

## 6. Image storage

In Vercel → Storage, create a **Blob** store and connect it to the project; this sets `BLOB_READ_WRITE_TOKEN`. Uploads are rotated, resized to a maximum of 2000px and converted to WebP. Very large phone photos are also shrunk in the browser before upload. Locally, without a token, files are saved to `public/uploads` (git-ignored).

## 7. Admin accounts

- The first owner is created by the seed from `SEED_ADMIN_*`.
- To add or reset an account at any time (the script asks for the password):

  ```bash
  npm run admin:create -- owner@rivkahluxe.com "Rivkah" SUPER_ADMIN
  ```

  Roles: `SUPER_ADMIN`, `STORE_MANAGER`, `CONTENT_MANAGER`.
- The owner can also add team members from **Dashboard → Team**.
- **Change the seeded password** after the first sign-in: use "Forgot password", or run `admin:create` again.

## 8. Deploy to Vercel

1. Push this folder to a GitHub repo and **Import** it in Vercel (framework: Next.js).
2. Settings → General → **Build Command**: `npm run vercel-build`. This generates the Prisma client, runs migrations, then builds.
3. Add all environment variables (Production and Preview). Set `NEXT_PUBLIC_SITE_URL` to the real domain.
4. Deploy, then seed **once** from your machine against the production database:

   ```bash
   DATABASE_URL="<prod url>" SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run db:seed
   ```

   If you don't want demo products, run `npm run db:remove-demo` afterwards.
5. Add the Stripe/Paystack webhooks pointing at the production domain.
6. Sign in at `/admin/login`, follow the **setup guide**, and publish the store under **Settings → Publish**.

## 9. Domain

In Vercel → Settings → Domains, add `rivkahluxe.com` and `www.rivkahluxe.com`, then create the DNS records Vercel shows at your registrar: an **A** record `76.76.21.21` for the root and a **CNAME** `cname.vercel-dns.com` for `www`. HTTPS is automatic. Update `NEXT_PUBLIC_SITE_URL` and both webhook URLs.

## 10. Backups & data safety

| What | Where it lives | Backup |
|---|---|---|
| Orders, products, customers, content, settings | PostgreSQL | Turn on your provider's **automatic daily backups / point-in-time recovery** (Neon, Supabase and Vercel Postgres include this). Also take a weekly manual dump: `pg_dump "$DATABASE_URL" -Fc -f rivkah-$(date +%F).dump` and store it off-site (e.g. Google Drive). |
| Product photos | Vercel Blob | Files are durable on Vercel. To keep a copy, download them with `vercel blob list` / the Blob dashboard, or keep the original photos in a shared folder. |
| Payments | Stripe / Paystack | The providers are the source of truth. Every order also stores the payment reference. |
| Secrets | Vercel environment variables | Keep a copy in a password manager (1Password/Bitwarden). Never in email or chat. |

**Recovery:**
1. Create a new database.
2. Restore it with `pg_restore -d "$NEW_DATABASE_URL" --clean rivkah-YYYY-MM-DD.dump` (or use your provider's restore point).
3. Update `DATABASE_URL` in Vercel.
4. Redeploy.

Photos are referenced by URL, so they keep working. The app never hard-deletes orders automatically; stock changes and admin actions are recorded in `InventoryMovement` and `AuditLog`.

## 11. Security notes

- Passwords are hashed with bcrypt (cost 12). Sessions use random tokens, stored hashed, in `httpOnly`, `SameSite=Lax` cookies (`Secure` in production). Password-reset links expire after 1 hour and work once.
- Admin access is enforced on the server in every page and action (the proxy redirect is only a convenience).
- Rate limits (stored in Postgres) cover sign-in, registration, password reset, contact, newsletter, reviews, coupons, checkout, cart and uploads.
- Every form is validated on the server with Zod. Rich text is sanitised before saving. Prisma parameterises all queries.
- Server Actions have built-in origin checks (CSRF). The upload endpoint also checks the origin.
- Webhooks: Stripe signatures are verified with the SDK, Paystack with HMAC-SHA512. Either way the payment is **re-checked with the provider's API**. Amount or currency mismatches are flagged for the owner, not marked paid.
- Security headers: CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, HSTS (in production). Admin pages are also served with `noindex`.
- Customers never see raw errors. Technical details go to the server logs.

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| `Can't reach database server` locally | Start the dev database: `npm run db:dev` |
| "Online payment isn't available" at checkout | No payment provider is configured. Set the Stripe/Paystack keys (or `PAYMENT_TEST_MODE=true` locally). |
| Orders stay "Awaiting payment" after paying | The webhook isn't reaching the site. Check the webhook URL and secret in Stripe/Paystack and look at the delivery logs. Customers can also press "Try payment again". |
| Emails not arriving | Settings → Payments shows whether email is connected. Check the `EmailLog` table and your SMTP provider's dashboard and domain verification. |
| Uploads fail in production | `BLOB_READ_WRITE_TOKEN` is missing. Connect a Blob store in Vercel. |
| Changed prices don't show | Pages update immediately after saving. Hard-refresh the browser. |
| Locked out of the dashboard | `npm run admin:create -- you@email.com "Name"` resets the password. |
| Demo products still showing | `npm run db:remove-demo` |

## 13. Demo imagery

The demo product photos are rendered by `npm run images:render`: clear glass pump bottles, droppers and jars carrying the brand's real label artwork from `assets/labels`. They are placeholders. Upload real photography per product in the dashboard (Products → product → Photos).

Payment marks in `public/payments` come from Simple Icons (CC0), apart from Mastercard (drawn to its official spec) and Paystack (logo from Wikimedia Commons). They are trademarks of their respective owners.
