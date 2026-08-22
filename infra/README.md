# Infra

Local infrastructure starts with PostgreSQL and Redis:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Production deployment remains split by boundary:

- `apps/web`: Vercel
- `apps/admin`: static hosting
- `services/api`: independent Node.js service
- Media: Cloudflare R2 + CDN
