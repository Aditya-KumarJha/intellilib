# IntelliLib Reservation + Queue Flow

## What is implemented

1. Physical issue workflow with concurrency handling.
2. Digital books bypass issue flow and remain directly accessible.
3. Queue-based reservations for unavailable physical books.
4. Queue processing scheduler for approval/expiry.
5. In-app notifications + RabbitMQ/Resend mail delivery.

## API endpoints

- `POST /api/library/issue`
  - Body: `{ "bookId": number }`
  - Digital book: returns `mode: digital_access`.
  - Physical book: creates transaction for first free physical copy.

- `GET /api/library/reservations?history=0|1`
  - Returns current user's reservations.

- `POST /api/library/reservations`
  - Body: `{ "bookId": number }`
  - Adds user to waiting queue when physical copies are unavailable.

- `DELETE /api/library/reservations?id=<reservationId>`
  - Cancels active reservation and compacts queue.

- `POST /api/library/queue/process`
  - Header: `x-scheduler-token: <RESERVATION_SCHEDULER_TOKEN>`
  - Expires stale approvals (24h) and promotes waiting users based on available copies.

## Queue behavior

- If 2 copies become available, first 2 users in queue are promoted to `approved`.
- Approved users are notified to collect within 24 hours.
- If they do not collect in time, reservation is cancelled and next users are promoted.

## Worker

RabbitMQ mail worker file:

- `scripts/notification-worker.mjs`

Run worker:

```bash
npm run worker:notifications
```

## Scheduler setup

Call the queue processor endpoint from a cron job every 5 minutes:

```bash
curl -X POST "http://localhost:3000/api/library/queue/process" \
  -H "x-scheduler-token: $RESERVATION_SCHEDULER_TOKEN"
```

### Vercel cron (already configured)

- `vercel.json` runs `/api/library/queue/process/cron` every 5 minutes.
- That route validates `Authorization: Bearer <CRON_SECRET>`.
- Set `CRON_SECRET` in Vercel project environment variables.

### GitHub Actions scheduled fallback (already configured)

- Workflow file: `.github/workflows/queue-process-cron.yml`
- Runs every 5 minutes and calls your scheduler endpoint.
- Add repository secrets:
  - `QUEUE_PROCESS_ENDPOINT` (example: `https://your-domain.com/api/library/queue/process`)
  - `RESERVATION_SCHEDULER_TOKEN`

### Supabase edge schedule option

If you prefer Supabase scheduling, create an Edge Function that sends a POST request to `/api/library/queue/process` with `x-scheduler-token`, then schedule it with `pg_cron` every 5 minutes.

## Auto-running worker

Run the notification worker as a restart-always container:

```bash
npm run worker:up
```

Check logs:

```bash
npm run worker:logs
```

Stop it:

```bash
npm run worker:down
```

Files:

- `Dockerfile.worker`
- `docker-compose.worker.yml`

## Required environment variables

- `RABBITMQ_URL`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `RESERVATION_SCHEDULER_TOKEN`
- `CRON_SECRET` (for Vercel cron route)
