## American Songwriter App (Public)

Public-facing application for contestants and fans: profiles, submissions, checkout, voting, and Stripe webhooks.

### Highlights
- Contestant profiles and onboarding
- Entry submission across categories and competitions
- Checkout flows for entries, memberships, and vote packs
- Fan voting and vote pack purchase
- Stripe webhooks for payment confirmation
- Supabase OTP authentication and storage usage

---

## Tech Stack
- Next.js 15, React 19, App Router
- Prisma 6.x with PostgreSQL
- Supabase (Auth/Server/Client)
- Stripe (Checkout + Webhooks)
- Tailwind CSS 4, shadcn/ui, Radix

---

## Directory Overview
```
src/
├── app/
│   ├── (contestant)/            # Contestant profile, membership, orders
│   ├── [slug]/                  # Public profile and voting routes
│   ├── api/
│   │   ├── create-payment-intent/  # Entry/membership/vote intents
│   │   ├── webhook/                 # Stripe webhooks (entry/vote)
│   │   └── categories/              # Public categories
│   ├── auth/                     # Auth pages and callbacks
│   ├── checkout/                 # Checkout flow and success page
│   └── layout.tsx, page.tsx
├── components/                  # UI and feature components
├── lib/
│   ├── supabase/                # client/server/middleware
│   ├── *-actions.ts             # server actions per domain
│   └── db.ts, utils.ts
└── middleware.ts
```

Key server actions in `src/lib/` include: `category-actions.ts`, `competition-actions.ts`, `contestant-actions.ts`, `order-actions.ts`, `product-actions.ts`, `public-contestant-actions.ts`, `song-actions.ts`, `support-actions.ts`, `vote-actions.ts`, plus voting integrity helpers.

---

## Environment Variables
Create `.env` in this folder with at least:

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DB

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET_ENTRY=whsec_xxx
STRIPE_WEBHOOK_SECRET_VOTE=whsec_xxx

# ReCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=site_key
RECAPTCHA_SECRET_KEY=secret_key

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notes
- Webhooks: configure `STRIPE_WEBHOOK_SECRET_ENTRY` and `STRIPE_WEBHOOK_SECRET_VOTE` for `/api/webhook/entry` and `/api/webhook/vote`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only.

---

## Scripts
```bash
# Dev server (Turbopack)
npm run dev

# Build (includes Prisma generate)
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

---

## Local Development
1) Install dependencies
```bash
npm install
```

2) Database setup
```bash
npx prisma generate
npx prisma migrate dev
```

3) Run the app
```bash
npm run dev
# Visit http://localhost:3000
```

---

## Payments and Webhooks Flow
- Client calls server actions to create Stripe Payment Intents for entries/memberships/votes
- User completes checkout on Stripe
- Webhooks (entry/vote) verify signature, record purchases/votes, and update domain records

---

## Authentication Flow
- Supabase OTP sign-in
- Route protection via middleware and server-side session helpers

---

## Deployment
- Vercel recommended; configure all environment variables in project settings
- Use managed Postgres (Supabase/Neon) and run `prisma migrate deploy` during CI/CD
