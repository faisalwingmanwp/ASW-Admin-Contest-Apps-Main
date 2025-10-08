## American Songwriter Management (Admin Portal)

Administrative portal for managing the American Songwriter contest ecosystem: competitions, entries, screeners, team invites, support, analytics, imports, and fan voting configuration.

### Highlights
- Role‑based admin and screener workflows
- Competition and category management
- Entry lifecycle and multi‑round reviews with statuses
- Screener assignment and screening workspace
- Team invitations and role approvals
- Fan voting enable/disable per competition
- Stripe product/price management for entries and vote packs
- Supabase Auth, Postgres via Prisma, email via Resend

---

## Tech Stack
- Next.js 15, React 19, App Router
- Prisma 6.x with PostgreSQL
- Supabase (Auth/Server/Client)
- Stripe (server SDK)
- Resend (transactional email)
- Tailwind CSS 4, shadcn/ui, Radix primitives

---

## Directory Overview
```
app/
├── api/
│   └── sync-import/              # Data bootstrap/import endpoints
├── auth/                         # Admin auth + OTP flows
├── dashboard/                    # Admin dashboard
│   ├── competitions/             # CRUD + edit pages
│   ├── entries/                  # Entries overview & management
│   ├── fan-voting/               # Fan voting admin + per-competition view
│   ├── screeners/                # Screener management + invitations
│   ├── support/                  # Support tickets
│   ├── sync/                     # Operational sync tools
│   └── analytics/                # KPIs & trends
└── screening/                    # Screener workspace (assigned reviews)

components/                       # UI + feature components
lib/
├── actions/                      # Server actions (Stripe, Supabase, domain ops)
├── prisma.ts, db.ts              # Prisma client singleton
├── supabase/                     # Supabase SSR/client/middleware/service role
└── utils.ts                      # Shared utilities

prisma/
└── schema.prisma                 # Database schema (see repo root README for model reference)
```

Key server action groups in `lib/actions/`:
- `auth-actions.ts`: login/OTP flows, invite acceptance, role checks
- `competition/competition-actions.ts`: create/update competitions
- `entry-actions.ts`, `entry-details-actions.ts`: entry lifecycle
- `review-actions.ts`, `screener-actions.ts`, `screener-entry-actions.ts`: screening and reviews
- `product-actions.ts`, `stripe-product-actions.ts`, `vote-pack-actions.ts`: Stripe-backed products and vote packs
- `support-actions.ts`: notifications, support emails (Resend)
- `import-actions.ts`, `analytics-actions.ts`, `team-actions.ts`: imports, KPIs, team

---

## Environment Variables
Create a `.env` file in this folder with at least:

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DB

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# App URLs
NEXT_PUBLIC_SITE_URL=https://admin.your-domain.com
NEXT_PUBLIC_BASE_URL=https://admin.your-domain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_or_test

# Email (Resend)
RESEND_API_KEY=re_xxx
```

Notes
- `SUPABASE_SERVICE_ROLE_KEY` is used server-side only (never expose client-side).
- Some email templates fall back to `https://contests.americansongwriter.com` if `NEXT_PUBLIC_BASE_URL` is missing.
- See repository root README for database model details and review statuses.

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

# Seed database (uses prisma/seed.ts)
npm run prisma:seed
```

---

## Local Development
1) Install dependencies
```bash
npm install
```

2) Configure environment
```bash
cp .env.example .env   # if you keep one; otherwise create .env using the vars above
```

3) Database setup
```bash
npx prisma generate
npx prisma migrate dev
npm run prisma:seed     # optional, if seed script is configured
```

4) Run the app
```bash
npm run dev
# Visit http://localhost:3000
```

---

## Core Domain Concepts
- Competition: name, window (start/end), price, `fanVotingEnabled`, archive flag
- Category: taxonomy for entries; many-to-many via `SongCategory`
- Entry: links `Contestant`, `Competition`, `Song`, `Category`, `Product`
- Review: `EntryReview` with `reviewRound`, `overallScore`, and statuses
- Screener: linked to `users` record; assigned `EntryReview`s
- Product & VotePack: Stripe-backed catalog for entries and vote packs
- Purchase & Vote: transactional records for purchases and fan voting

Statuses & Enums (subset)
- `ReviewStatus`: UNASSIGNED, PENDING_REVIEW, COMPLETED, REJECTED, NEEDS_MORE_INFORMATION, NEEDS_ANOTHER_REVIEW, HIDDEN
- `UserRole`: ADMIN, SCREENER, CONTESTANT, FAN, UNVERIFIED
- `ProductType`: ENTRY, VOTEPACK, MEMBERSHIP, FAN_CONTEST

See the repository root README for a complete Prisma model reference and relationships.

---

## Integrations
- Supabase Auth (OTP), SSR helpers, and Storage usage
- Stripe server SDK for product catalog and pricing
- Resend for transactional emails

Webhook endpoints for Stripe are implemented in the public app (songwriter) rather than the admin portal.

---

## Deployment
- Designed for Vercel. Ensure all environment variables are configured in the deployment environment.
- Use a managed PostgreSQL (e.g., Supabase or Neon) and run `prisma migrate deploy` during CI/CD.
