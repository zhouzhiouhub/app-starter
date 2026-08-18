# Development Setup

## Requirements

- Node.js 20.18+
- pnpm 9+
- Docker for local PostgreSQL and Redis

## Install

```bash
pnpm install
```

## Local Services

```bash
docker compose -f infra/docker-compose.yml up -d
```

## Environment

Copy `.env.example` to `.env` and keep MVP feature flags disabled unless the
design document enters the matching phase:

```bash
COMMERCE_ENABLED=false
MULTI_LOCALE_ENABLED=false
```

## Run

```bash
pnpm --filter @app-starter/api exec prisma db push --schema prisma/schema.prisma
pnpm --filter @app-starter/api run prisma:seed
pnpm dev
```

Page write APIs use an `IdempotencyRecord` table. After pulling schema changes,
run `prisma db push` again in local development so repeated publish/create
requests can be safely deduplicated.

Admin page, localization, and commerce management APIs require a Bearer access
token from `POST /api/v1/auth/login`. Public storefront routes stay unauthenticated.

In local development the Admin app calls `/api/v1` on its own origin. Vite
proxies those requests to the API on port 4000, so the browser does not POST
login to the Vite server itself.

Default local ports:

- Web: http://localhost:3000
- Admin: http://localhost:5173
- API: http://localhost:4000/api/v1/health
