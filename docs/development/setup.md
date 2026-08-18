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

Admin page management APIs are intentionally unauthenticated only in
`development` and `test`. With `NODE_ENV=production`, those endpoints fail closed
until the planned JWT/RBAC identity module is implemented.

Default local ports:

- Web: http://localhost:3000
- Admin: http://localhost:5173
- API: http://localhost:4000/api/v1/health
