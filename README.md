## American Songwriter Monorepo

This monorepo contains two applications:
- `management/` – Admin portal for competitions, screening, analytics, imports, support, and configuration
- `songwriter/` – Public app for contestants and fans: profiles, submissions, checkout, voting, and webhooks

Both apps use the same PostgreSQL database schema managed by Prisma.

---

## Prisma Schema Overview

The schema (see `management/prisma/schema.prisma` and `songwriter/prisma/schema.prisma`) models contestants, fans, competitions, entries, reviews, purchases, vote packs, and voting.

### Models
- `Fan`: Optional email-based fan identity; can purchase vote packs and cast votes
- `Contestant`: A user who submits entries; has profile data and Stripe customer linkage
- `Category`: Entry taxonomy; many-to-many relation to `Song` via `SongCategory`
- `Song`: A song submitted by contestants and linked to entries
- `SongCategory`: Join table for song–category many-to-many
- `Product`: Stripe-backed catalog item; used for entries, memberships, vote packs, and fan contests
- `Competition`: A contest window; contains entries and optionally purchases
- `Entry`: A submission linking song, competition, category, contestant, and product
- `VotePack`: Quantity associated with a `Product` of type VOTEPACK
- `Vote`: Record of votes (may be anonymous); links to `Entry` and optionally a `Fan`
- `Purchase`: Record of purchases by fans or contestants; links to `Product` and optionally `Competition`
- `EntryReview`: Screener review records with status and round tracking
- `Screener`: Reviewer linked to a `users` record; has preferred categories
- `users`: Admin/screener/contestant/fan metadata used for role control
- `Invitation`: Email-based invitations for roles (e.g., screeners)

### Enums
- `ProductType`: ENTRY | VOTEPACK | MEMBERSHIP | FAN_CONTEST
- `ReviewStatus`: UNASSIGNED | PENDING_REVIEW | COMPLETED | REJECTED | NEEDS_MORE_INFORMATION | NEEDS_ANOTHER_REVIEW | HIDDEN
- `UserRole`: ADMIN | CONTESTANT | FAN | SCREENER | UNVERIFIED
- `InvitationStatus`: PENDING | ACCEPTED | EXPIRED
- `SubmissionErrorType`: BROKEN_LINK | AI_DETECTED | COVER_SONG | OTHER
- `ErrorStatus`: DETECTED | IN_PROGRESS | RESOLVED | IGNORED

---

## Relationships (high level)
- Contestant submits Song(s); an Entry binds Song + Category + Competition + Product
- VotePack belongs to a Product of type VOTEPACK
- Fan and Contestant can both create Purchases (for vote packs and entries respectively)
- Vote optionally links to Fan, always links to Entry
- Screener reviews Entries via EntryReview; Screener is linked to `users`
- Category relates to Song via SongCategory

---

## Environment and Migrations
Each app has its own `.env` and Prisma client generation step, but both should point to the same database when deployed together.

Typical workflow per app:
```bash
npx prisma generate
npx prisma migrate dev
# CI/CD: npx prisma migrate deploy
```

---

## Repositories and Deployment
- Admin (management): server actions for Stripe, Supabase, email, and administration.
- Public (songwriter): public routes, checkout, and Stripe webhooks.

Deploy both apps (e.g., to Vercel) with the same database credentials and properly configured environment variables (see app READMEs). Ensure Stripe webhook secrets are only configured for the public app.
