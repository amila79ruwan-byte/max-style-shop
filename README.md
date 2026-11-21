# Max Style Shop

Online shop for Sri Lanka. Static pages in `public/`, API in `functions/` (Cloudflare Pages Functions), data in Cloudflare D1.

## Cloudflare settings (Pages project → Settings)

**D1 binding** (Settings → Bindings → D1 database)
- Variable name: `DB`  (must be exactly this)

**Environment variables / secrets** (Settings → Variables and Secrets)

| Name | Needed? | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | Yes | Password for every admin page. Use 16+ random characters. A short password is the weakest part of the shop. |
| `PIN_PEPPER` | Strongly recommended | Secret mixed into customer PIN hashes, so a stolen database alone cannot be cracked (4-digit PINs are easy otherwise). **Never change or delete it after customers have signed up**, or they can no longer sign in. |
| `TURNSTILE_SITEKEY` + `TURNSTILE_SECRET` | Recommended | Cloudflare Turnstile bot check at checkout. Both must be set, or the check stays off. |

## First-time database setup
Run `schema.sql` once (Cloudflare dashboard → D1 → your database → Console, or `wrangler d1 execute <DB> --file=schema.sql`).
It is safe to run again: every table uses `IF NOT EXISTS`.
`migrate_sizes.sql` is only for very old databases that have no `sizes` column.

## Folders
- `public/` – the website. Admin pages: `admin.html` (products, orders, stats), `orders.html`, `photos.html`, `banners.html`, `paymethods.html`, `pinreset.html`.
- `public/_headers` – security headers (CSP etc.). If a page breaks after changing it, remove the `Content-Security-Policy` line first.
- `functions/_middleware.js` – locks an IP for 15 min after 10 wrong admin passwords.
- `functions/_lib/` – shared code: `expire.js` (auto-cancel unpaid orders after 24 h), `ratelimit.js` (limits), `serve.js` (safe image serving + cache).
- `functions/api/` – one file per API: products, orders, account, banners, photos, paymethods, installs, images.

## Limits built into the code
| What | Limit |
|---|---|
| Wrong admin password | 10 per IP → 15 min lock |
| Wrong customer PIN | 5 per phone, 20 per IP → 15 min lock |
| Orders | 10 per IP per hour, 2 unconfirmed orders per phone, 40 pieces per order |
| Order tracking | 30 tries per IP per hour, 20 per order code per hour |
| First-order check / slip-sent | 30 / 20 per IP per hour |
| App install count | 3 per IP per day |

## Money rules (in `functions/api/orders.js`)
First order 10% off (signed-in customers) · delivery Rs. 350, free from Rs. 7,000 · cash on delivery +Rs. 150 · gift wrap Rs. 200.
Prices are always read from the database on the server; the browser's prices are never trusted. If you change a rule, also change the matching numbers in `public/shop2.js` and `public/shop4.js` (they only show the total on screen).

## Not used (safe to delete)
`public/app.js` (old version, not loaded by `index.html`) and `public/styles.css` (identical copy of `shop.css`).
