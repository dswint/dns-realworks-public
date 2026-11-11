# DNS Realworks

Multi-tenant direct-booking platform. DNS Realworks is tenant zero: one
origin per host brand, property trees under `/properties/[slug]`, Hospitable
calendar, PriceLabs rates, AirDNA market stats, Stripe checkout for trusted
guests.

This repository is the application source. Credentials stay in `.env.local`
or the host's environment. `.env.local.example` lists every variable and
contains no keys.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind v4 + shadcn (`base-nova`)
- Supabase (Postgres, Storage) via `@supabase/ssr`
- Better Auth for staff (users live in our Postgres)
- Vercel

## Getting started

```bash
npm install
cp .env.local.example .env.local
```

Fill in your own Supabase URL, anon key, service role key, `DATABASE_URL`,
and `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Then:

```bash
npm run dev
```

First admin: open `/admin/login`, register once. That user becomes owner of
tenant zero.

Stripe, Resend, and the AI Gateway key are optional until you use checkout,
magic-link email, or house-guide drafts.

### Database

Local Docker:

```bash
supabase start
supabase db reset
npm run db:types
```

Hosted Postgres: link your own project, then push migrations.

```bash
supabase link --project-ref [PROJECT_REF]
supabase db push
```

`DATABASE_URL` must use the session pooler (`aws-0-[region].pooler.supabase.com:5432`).

## Quality, review, and debugging

- **Standards:** TypeScript strict, ESLint `core-web-vitals`, Prettier, Next.js 16 App Router. Cursor rule: `.cursor/rules/coding-standards.mdc`.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, and format check on `main` and every PR.
- **Code review:** Cursor Bugbot on pull requests (`.cursor/config/bugbot.yaml`). Comment `cursor review` on a PR to run it manually. Enable the repo at [Cursor Automations → Bugbot](https://cursor.com/automations) if it is not already connected to GitHub.
- **Debugging:** Run **Next.js: debug full stack** from the Run and Debug view (`.vscode/launch.json`). Use `logger` from `lib/logger.ts` for structured server logs.

```bash
npm run lint
npm run typecheck
npm run format:check
npm run check
```

## Tenancy

Host header → `companies.custom_domain` or `companies.slug`. Local/dev falls
back to `DEV_FALLBACK_COMPANY_SLUG` (seeded `dns-realworks`). Adding another
host is a `companies` row, not a rewrite.

## Hospitable (booking flow)

Hospitable is the calendar and reservation backbone:

1. In [my.hospitable.com](https://my.hospitable.com): **Apps → API access → Add new** with **Read** and **Write**.
2. **Admin → Integrations**: paste the PAT and **Save** (or **Test connection**) — new Hospitable listings auto-import as draft properties.
3. **Admin → Properties**: edit, publish, or delete imported properties; use **Sync listings** if you add homes in Hospitable later.
4. **Apps → Webhooks → Add new** → URL  
   `https://<your-site>/api/webhooks/hospitable/<company-uuid>`  
   (company uuid is shown on the Integrations page). Enable **Reservations**.
5. Optional webhook secret in admin (HMAC `Signature` header or `Authorization: Bearer`).
6. Click **Import reservations** on Integrations to backfill guests and blocks.

Direct checkout (after Stripe is configured) calls Hospitable `POST /reservations`
when payment succeeds. Quotes use the Hospitable calendar when a property is
linked, plus PriceLabs/cached rates and local booking rows.
