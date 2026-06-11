# JobRadar Server

NestJS backend for [JobRadar](https://jobradar.tech): job ingestion, filtering, auth (GitHub Sponsors), and email notifications.

AWS-related work lives on the **[`aws` branch](https://github.com/zsevic/jobradar-server/tree/aws)** — CDK stacks, Lambda/API Gateway, RDS, DynamoDB, SES, and the GitHub Actions deploy workflow.

```bash
git fetch origin aws
git checkout aws
```

## Local development

### Setup

```bash
npm install
cp .env.example .env
```

### Infrastructure

```bash
docker compose up -d
docker compose down      # stop
docker compose down -v   # stop and wipe data
```

Defaults from `.env.example`:

- `DATABASE_URL=postgres://jobradar:jobradar@localhost:5433/jobradar`
- `REDIS_URL=redis://localhost:6379`

### Run

```bash
npm run start:dev
```

Migrations run on boot unless `SKIP_DB_MIGRATIONS=true`. Source catalog is upserted on boot unless `SKIP_SOURCE_SEED=true`.

### Database

```bash
npm run migration:run
npm run migration:revert
npm run migration:generate
npm run seed:sources
```

### Auth

Set GitHub OAuth and Sponsors env vars in `.env` (see `.env.example`), then open:

```http
GET /api/auth/github
```

Users sign in with GitHub; access requires an **active** sponsorship of `@zsevic`. Sponsorship is re-checked on protected API routes and before digest emails.

### Tests

```bash
npm test
npm run test:e2e
npm run test:cov
```
