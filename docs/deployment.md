# Deployment Guide

This project is a monorepo with a Next.js web app, a NestJS API, PostgreSQL,
and an optional Redis-compatible queue. Deploy the API first, then deploy the
web app with the public API URL.

## Recommended Topology

- Web: `apps/web` on Vercel.
- API: `apps/api` on Render.
- Database: Render PostgreSQL.
- Queue: Render Key Value.
- Domains: `www.example.com` for the web app and `api.example.com` for the API.

## Render API

The root `render.yaml` defines:

- `image-platform-api`: Node web service.
- `image-platform-postgres`: PostgreSQL database.
- `image-platform-redis`: Key Value service for `REDIS_URL`.

Create a Render Blueprint from the GitHub repository, then set the secret
environment variables that are marked with `sync: false`.

Required secrets:

- `OPENAI_API_KEY`: Official platform OpenAI key.
- `STABILITY_API_KEY`: Stability key, if enabled.
- `CUSTOM_PROVIDER_URL`: Custom model gateway URL, if enabled.
- `CUSTOM_PROVIDER_TOKEN`: Custom model gateway bearer token, if enabled.
- `DEV_API_KEY`: Optional internal API key for MVP testing.
- `DEV_OWNER_EMAIL`: Owner email shown in the operations dashboard.

The API build command is:

```bash
npm ci && npm run build:api:prod
```

The API pre-deploy command is:

```bash
npm run deploy:api:migrate
```

The API start command is:

```bash
npm run start:api:prod
```

After deployment, copy the API URL. It will look like:

```text
https://image-platform-api.onrender.com
```

## Vercel Web

Create a Vercel project from the GitHub repository and set the Root Directory to:

```text
apps/web
```

The `apps/web/vercel.json` file runs the install and build from the monorepo
root so the shared package is built before the Next.js app.

Set this environment variable in Vercel before the first production build:

```bash
NEXT_PUBLIC_API_BASE_URL=https://image-platform-api.onrender.com
```

Replace the value with your real Render API URL or custom API domain.

## Custom Domains

Recommended domains:

- `www.example.com`: Vercel web app.
- `api.example.com`: Render API service.

After the API domain is live, update Vercel:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

Then redeploy the web app.

## Production Notes

- The API currently enables open CORS for MVP development. Restrict it to your
  web domain before public launch.
- The web login, credit recharge, and user API settings currently use
  `localStorage`. Replace them with server-side auth, encrypted key storage,
  payment webhooks, and quota deduction before charging real users.
- Keep official provider API keys only in the API service environment. Do not
  expose them as `NEXT_PUBLIC_*` variables.
- Keep PostgreSQL enabled in production. Without `DATABASE_URL`, API data falls
  back to memory.
- Keep Redis or Key Value enabled in production. Without `REDIS_URL`, generation
  tasks run in-process.
