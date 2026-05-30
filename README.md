# JobRadar Server

NestJS backend for [JobRadar](https://jobradar.tech): job ingestion, filtering, auth (Gumroad licenses), and email notifications.

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

Set `GUMROAD_PRODUCT_ID` and `JWT_SECRET` in `.env`, then:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "licenseKey": "xxxx-xxxx-xxxx"
}
```

License keys are validated against Gumroad on every login and stored on the user record for re-verification before digest emails.

### Tests

```bash
npm test
npm run test:e2e
npm run test:cov
```
