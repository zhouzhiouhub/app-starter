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
pnpm dev
```

Default local ports:

- Web: http://localhost:3000
- Admin: http://localhost:5173
- API: http://localhost:4000/api/v1/health
