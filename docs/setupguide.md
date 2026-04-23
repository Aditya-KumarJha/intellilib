# IntelliLib Setup Guide for Developers

This guide explains how to set up IntelliLib from scratch, configure all required environment variables, run locally, and deploy to production.

## 1. What You Are Setting Up

IntelliLib has two runtime parts:

1. Next.js app (frontend + API routes)
2. Notification worker (RabbitMQ consumer that sends emails via Resend)

You can run only the app for UI/API development, or run both app + worker for full queue/email flow.

## 2. Prerequisites

Install these tools first:

- Node.js 20+ (recommended even though README says 18+)
- npm (comes with Node)
- Git
- Docker Desktop (only if running worker in Docker)
- A Supabase project
- Optional but recommended accounts:
  - Groq (AI assistant)
  - Razorpay (payments)
  - Resend (email)
  - RabbitMQ provider (CloudAMQP, Upstash QStash alternative not directly compatible, self-hosted RabbitMQ, etc.)
  - EmailJS (contact form)
  - ImageKit (if using image upload/management features)

## 3. Clone and Install

```bash
git clone https://github.com/Aditya-KumarJha/intellilib.git
```
```bash
cd intellilib
```
```bash
npm install
```

## 4. Create Environment Files

The repository includes `.env.example`.

### 4.1 App runtime env file

```bash
cp .env.example .env.local
```

`npm run dev` uses `.env.local` automatically in Next.js.

### 4.2 Worker runtime env file

`docker-compose.worker.yml` loads environment from `.env`, not `.env.local`.

For worker support, either:

```bash
cp .env.local .env
```

or keep both files manually in sync.

## 5. Environment Variables (What, Where, and How to Get)

Below is every variable used by this repo.

## 5.1 Supabase (Required)

### NEXT_PUBLIC_SUPABASE_URL
- What: Your Supabase project URL
- Used by: Browser and server clients
- Where to get:
  1. Open Supabase dashboard
  2. Select your project
  3. Go to Project Settings -> API
  4. Copy Project URL

### NEXT_PUBLIC_SUPABASE_ANON_KEY
- What: Public anon key for client operations
- Where to get: Supabase Project Settings -> API -> anon/public key

### NEXT_SUPABASE_SERVICE_ROLE_KEY
- What: Service role key for privileged server operations and seed scripts
- Where to get: Supabase Project Settings -> API -> service_role key
- Security: Never expose this in client-side code or browser logs

### NEXT_PUBLIC_SITE_URL
- What: Base URL used for SEO/canonical metadata
- Local value: http://localhost:3000
- Production value: Your deployed domain (for example https://your-domain.com)

## 5.2 AI Integrations

### GROQ_API_KEY
- What: Key for librarian/user assistant routes
- Where to get:
  1. Sign in to Groq Console
  2. Create an API key
  3. Paste into env

### GEMINI_API_KEY
- What: Optional in current workflows, included in env template
- Where to get: Google AI Studio / Google AI platform key page

## 5.3 Payments (Razorpay)

### RZP_KEY_ID
### RZP_KEY_SECRET
- What: Razorpay credentials for order creation and verification
- Where to get:
  1. Sign in to Razorpay Dashboard
  2. Go to Settings -> API Keys
  3. Generate Test mode keys for development
  4. Use Live mode keys only in production
- Important: Keep secret key server-side only

## 5.4 Queue and Notification Pipeline

### RABBITMQ_URL
- What: RabbitMQ connection URI used by API and worker
- Format example: amqps://username:password@host/vhost
- Where to get:
  - From your RabbitMQ provider connection page
  - Or your self-hosted RabbitMQ config

### RESEND_API_KEY
- What: API key for sending emails from worker
- Where to get:
  1. Sign in to Resend dashboard
  2. Create API key

### RESEND_FROM
- What: Verified sender email address
- Example: no-reply@yourdomain.com
- Where to get:
  1. Verify your domain in Resend
  2. Create/use a sender on that domain

### CRON_SECRET
- What: Secret used by /api/library/queue/process/cron route
- How to generate:
```bash
openssl rand -hex 32
```

### RESERVATION_SCHEDULER_TOKEN
- What: Token used for protected queue processing endpoints
- How to generate:
```bash
openssl rand -hex 32
```

## 5.5 Contact Form (EmailJS, Optional)

### NEXT_PUBLIC_EMAILJS_SERVICE_ID
### NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
### NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
- What: Client-side EmailJS config for contact section
- Where to get:
  1. Sign in to EmailJS
  2. Create Email Service
  3. Create Email Template
  4. Copy service ID, template ID, and public key

## 5.6 Image Handling (Optional)

### IMAGEKIT_PRIVATE_KEY
### IMAGEKIT_PUBLIC_KEY
### IMAGEKIT_URL_ENDPOINT
- What: ImageKit credentials for media integration
- Where to get:
  1. Sign in to ImageKit
  2. Go to Developer options/API keys
  3. Copy public/private keys and URL endpoint

## 5.7 Seed Script Extras (Optional)

Used by `scripts/seed-more-books.js`:

### SEED_TARGET_USER_EMAIL
- Target user email for generating user-linked data
- Default exists in script if omitted

### SEED_MIN_BOOKS
- Minimum books to ensure in DB

### SEED_USER_BOOKS
- Number of books to issue to target user in seed scenario

Also supported fallback keys for scripts:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

If primary NEXT_* keys are set, you usually do not need fallbacks.

## 6. Database Setup (Supabase)

1. Create a new Supabase project
2. Open SQL Editor
3. Execute the full file at `docs/sql.dump.sql`
4. Confirm tables/functions/triggers/RLS are created

Recommended:

- Review schema docs in `docs/sql.schema.md`
- Keep RLS enabled in production

## 7. Local Development Run

### 7.1 Start app only

```bash
npm run dev
```

Open: http://localhost:3000

### 7.2 Start notification worker via Docker

```bash
npm run worker:up
npm run worker:logs
```

Stop worker:

```bash
npm run worker:down
```

### 7.3 Run worker directly without Docker

```bash
npm run worker:notifications
```

### 7.4 Replay dead-letter queue messages

```bash
npm run worker:replay-dead-letter
```

## 8. Validation Checklist (Before Team Handoff)

Run these checks:

```bash
npm run lint
npm run test
npm run build
```

Then verify manually:

- Sign up / login works
- Dashboard role routing works (user/librarian/admin)
- Search and book detail endpoints respond
- Reservation + issue/return flows behave correctly
- Razorpay test payment flow passes (if configured)
- Queue process endpoints authenticate correctly
- Worker consumes RabbitMQ messages and sends Resend emails

## 9. Deployment Guide

Primary target is Vercel for web app. Worker should be deployed separately.

## 9.1 Deploy Next.js app to Vercel

1. Push code to GitHub
2. In Vercel dashboard, import repository
3. Framework should be detected as Next.js
4. Build command: `npm run build` (default is fine)
5. Output: managed by Next.js (default)
6. Add all required env vars in Vercel Project Settings -> Environment Variables
   - Add for Production (and Preview/Development as needed)
7. Trigger deployment

After deploy:

- Set `NEXT_PUBLIC_SITE_URL` to your production URL
- Redeploy after env updates

## 9.2 Configure scheduled queue processing

Choose one strategy:

1. External scheduler calls `/api/library/queue/process/cron` with `Authorization: Bearer <CRON_SECRET>`
2. External scheduler calls `/api/library/queue/process` with `Authorization: Bearer <RESERVATION_SCHEDULER_TOKEN>`

If using Vercel Cron Jobs, configure cron in Vercel dashboard/project settings and pass proper auth header secret.

## 9.3 Deploy worker service (separate from Vercel)

Because worker is a long-running process, deploy it on a container host (for example Render, Railway, Fly.io, ECS, VM).

Use provided files:

- `Dockerfile.worker`
- `docker-compose.worker.yml` (local compose reference)

Worker command:

```bash
npm run worker:notifications
```

Required worker envs at minimum:

- RABBITMQ_URL
- RESEND_API_KEY
- RESEND_FROM

Recommended also provide full shared env set where relevant.

## 9.4 Production hardening tips

- Use separate Supabase projects for dev/staging/prod
- Rotate service keys periodically
- Restrict who can view production environment variables
- Use test Razorpay keys in non-production environments
- Keep CRON_SECRET and RESERVATION_SCHEDULER_TOKEN long and random
- Monitor worker logs and dead-letter queue size
- Set up alerting on failed email sends or queue backlogs

## 10. Common Setup Issues

### App fails with missing env error
- Cause: `.env.local` missing keys
- Fix: compare with `.env.example`, restart `npm run dev`

### Worker starts but does nothing
- Cause: wrong `RABBITMQ_URL`, empty queue, or missing `.env`
- Fix: verify worker is reading `.env`, check broker connectivity, inspect queue names

### Razorpay verify/order route fails
- Cause: incorrect key pair or mode mismatch (test vs live)
- Fix: ensure both `RZP_KEY_ID` and `RZP_KEY_SECRET` are from same mode

### No emails sent
- Cause: invalid `RESEND_API_KEY`, unverified sender domain, or wrong `RESEND_FROM`
- Fix: verify domain/sender in Resend and inspect worker logs

## 11. Quick Start Summary

For fastest setup:

1. Copy env template to `.env.local`
2. Fill Supabase keys + URL and site URL
3. Run SQL from `docs/sql.dump.sql`
4. Run `npm install && npm run dev`
5. (Optional) copy `.env.local` to `.env` and run worker

You now have a full local IntelliLib development environment.