# Real Weekend (Glassdoor / AmbitionBox for tourist places)

Search-first directory of weekend destinations with short ratings, recent photos and admin-written local updates. No login, no AI at runtime, free to run on Cloudflare.

## What is in here
- `app/` pages: `/` directory, `/place?s=goa` profile, `/rate?p=goa` 2-minute rating flow (the link goSTOPS sends after checkout), `/admin` backstage, `/stats`.
- `src/lib/api.ts` is the only file that talks to the backend. `src/lib/photo.ts` reads the photo's EXIF date, then compresses (this strips location data).
- `functions/api/[[path]].ts` the whole backend (Cloudflare Pages Function + D1 database + R2 photo storage).
- `data/places.mjs` destinations and spots. **Confirm the list against the goSTOPS city pages before launch.** `scripts/gen-seed.mjs` turns it into `db/seed.sql`.
- Set your name in `src/config.ts` (the required footer line).

## Rules built in
- Reviews are about places, never the hostel. A rating asks: who you went with, a face per spot, one optional tag, up to 3 photos, a 140-char comment.
- A group ranking only counts once a spot has 5 ratings from that group (`MIN_GROUP_RATINGS`); until then it falls back to the overall rating and says so. The admin's "suits" labels show as "Our pick".
- Nobody can delete opinions. Photos hide automatically after 3 reports; admin can unhide or hide. Max 3 photos per place per device, 5 submissions per hour per device, hidden honeypot field.
- Services and "things to know" are admin only (no links in services). Updates expire. The 5-day forecast comes from Open-Meteo (check their free-tier terms for commercial use).

## Run locally (Windows PowerShell, no account needed)
One-time setup:
```
npm install
npm run build
npx wrangler d1 execute real-weekend --local --file db/schema.sql
npx wrangler d1 execute real-weekend --local --file db/seed.sql
node scripts/gen-seed.mjs demo
npx wrangler d1 execute real-weekend --local --file db/demo.sql    # optional SAMPLE reviews, never in production
```
Every time, in two terminals:
```
# terminal 1: the backend (port 8788)
npx wrangler pages dev out --d1 DB=REPLACE_WITH_ID_FROM_wrangler_d1_create --r2 PHOTOS --binding ADMIN_PASSWORD=test --binding TOKEN_SECRET=anything
# terminal 2: the front end with live reload
npm run dev
```
Open http://localhost:3000 (admin password `test`). Without terminal 1 the page shows grey loading boxes, because there is no backend to answer. Open it as `localhost`, not your network IP, unless that IP is listed in `allowedDevOrigins` in `next.config.mjs`.

## Deploy (free Cloudflare account)
```
npx wrangler login
npx wrangler d1 create real-weekend            # copy database_id into wrangler.toml
npx wrangler r2 bucket create real-weekend-photos
npx wrangler d1 execute real-weekend --remote --file db/schema.sql
npx wrangler d1 execute real-weekend --remote --file db/seed.sql
pnpm build
npx wrangler pages deploy out --project-name real-weekend
npx wrangler pages secret put ADMIN_PASSWORD --project-name real-weekend
npx wrangler pages secret put TOKEN_SECRET --project-name real-weekend   # any long random string
```
Thank-you link format for goSTOPS to send: `https://YOUR-SITE/rate?p=goa` (one per property slug in the `properties` table).
Check Cloudflare's current free-tier limits before launch.

## Not built yet
User accounts and replies between users, partner hotels and promotions, per-booking one-time rating links, a Cloudflare Turnstile bot check, and a shareable story image.
