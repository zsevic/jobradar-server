# JobRadar Server

NestJS backend for [JobRadar](github.com/zsevic/jobradar): ingests jobs from Ashby, Greenhouse, Lever, and Workable, stores them in Postgres, and serves a public filtered jobs API.

## Local development

### Prerequisites

- Node.js 26+
- Docker (Postgres + Redis)

### Setup

```bash
npm install
cp .env.example .env
```

Set `PORT=3002` in `.env` if you use the default frontend `NEXT_PUBLIC_API_BASE_URL` (`http://localhost:3002/api`).

### Infrastructure

```bash
docker compose up -d
docker compose down      # stop
docker compose down -v   # stop and wipe data
```

Defaults from `.env.example`:

- `DATABASE_URL=postgres://jobradar:jobradar@localhost:5433/jobradar`
- `REDIS_URL=redis://localhost:6379`

Redis Commander is available at http://localhost:8081 when Docker is running.

### Run

```bash
npm run start:dev
```

On boot (unless skipped via env):

- Database migrations run (`SKIP_DB_MIGRATIONS=true` to skip)
- Source catalog is upserted (`SKIP_SOURCE_SEED=true` to skip)

API base path: `http://localhost:<PORT>/api`

## Public API

| Method | Path | Rate limit (default) | Description |
|--------|------|----------------------|-------------|
| `GET` | `/api/jobs/latest` | 30 req/min per IP | Latest jobs preview for the home page (optional `?country=`) |
| `GET` | `/api/jobs` | 60 req/min per IP | Paginated, filterable job feed (`role`, `stack`, `seniority`, `location`, `page`, `limit`) |

Over-limit responses return **429** with `Too many requests. Please try again later.`

Rate limits are Redis-backed (works across multiple instances). Tune via `RATE_LIMIT_PUBLIC_JOBS_*` in `.env` (see `.env.example`).

Scheduled polling runs automatically while the server is up (`SOURCE_POLLING_INTERVAL_MINUTES`, default 30). To trigger fetches manually:

```bash
npm run poll:sources              # all providers
npm run poll:company -- stripe    # one company (name or externalId)
```

Requires Redis and an running server (or workers) to process the queued jobs.

## Database

```bash
npm run migration:run
npm run migration:revert
npm run migration:generate
npm run seed:sources
```

## Scripts

```bash
npm run lint
npm run lint:fix
npm test
npm run test:e2e
npm run build
npm run start:prod
```

## CI

GitHub Actions runs on pushes and PRs to `main` / `master`: `npm ci`, lint, and unit tests (see `.github/workflows/ci.yml`).

## Production

Set `FRONTEND_ORIGIN` to your frontend URL for CORS. Requires `DATABASE_URL`, `REDIS_URL`, and rate-limit env vars from `.env.example`.
