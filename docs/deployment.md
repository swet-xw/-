# Deployment Guide

This project is a monorepo with a Next.js web app, a NestJS API, PostgreSQL,
and an optional Redis-compatible queue. Deploy the API first, then deploy the
web app with the public API URL.

You do not need a custom domain to launch the MVP. Start with the generated
service URLs from Render and Vercel, then add your own domain later.

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

- `CORS_ORIGIN`: Your deployed web origin. Use your Vercel domain first, for
  example `https://your-project.vercel.app`.
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

If the API fails to boot in production, check `CORS_ORIGIN` first. The API now
requires an explicit browser allowlist in production and will not start with
open CORS.

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

After the first Vercel deployment, note the generated web URL. It will usually
look like:

```text
https://your-project.vercel.app
```

Then go back to Render and set:

```bash
CORS_ORIGIN=https://your-project.vercel.app
```

Redeploy the API once so browser requests from the Vercel site are accepted.

## No-Domain Launch Order

1. Push the repository to GitHub.
2. Create the Render Blueprint from `render.yaml`.
3. Fill Render secrets except `CORS_ORIGIN`, then let Render create the API,
   PostgreSQL, and Key Value services.
4. Create the Vercel project with Root Directory `apps/web`.
5. Set `NEXT_PUBLIC_API_BASE_URL` in Vercel to the generated Render API URL.
6. Deploy Vercel and copy the generated `*.vercel.app` URL.
7. Set `CORS_ORIGIN` in Render to that `*.vercel.app` URL and redeploy the API.
8. Validate login, model listing, and image generation from the live Vercel URL.

## Custom Domains

Recommended domains:

- `www.example.com`: Vercel web app.
- `api.example.com`: Render API service.

After the API domain is live, update Vercel:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

Then update Render:

```bash
CORS_ORIGIN=https://www.example.com
```

Redeploy both services after the domain cutover.

## Production Notes

- `CORS_ORIGIN` accepts a comma-separated allowlist. This is useful when you
  want both a production domain and a temporary Vercel preview or generated URL.
- The web login, credit recharge, and user API settings currently use
  `localStorage`. Replace them with server-side auth, encrypted key storage,
  payment webhooks, and quota deduction before charging real users.
- Keep official provider API keys only in the API service environment. Do not
  expose them as `NEXT_PUBLIC_*` variables.
- Keep PostgreSQL enabled in production. Without `DATABASE_URL`, API data falls
  back to memory.
- Keep Redis or Key Value enabled in production. Without `REDIS_URL`, generation
  tasks run in-process.

## Minimum Go-Live Checklist

- Render API health check passes at `/generation/providers`.
- Vercel production site can load `/studio` without browser CORS errors.
- `OPENAI_API_KEY` or another provider credential is configured in Render.
- `DATABASE_URL` and `REDIS_URL` are both present in Render.
- `NEXT_PUBLIC_API_BASE_URL` points to the live Render API URL, not localhost.
- `CORS_ORIGIN` matches the live web origin exactly, without a trailing slash.
