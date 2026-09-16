# WhatsApp Cloud API Test Tool

Minimal Next.js app for testing WhatsApp Cloud API webhook delivery and message sending. Designed for Vercel.

## Storage: Upstash Redis

Vercel serverless functions are stateless — an in-memory array disappears after each request. This tool uses **Upstash Redis** (free tier, no card required) via their REST API. Each incoming webhook message is pushed to a Redis list; the frontend polls `/api/messages` every 2.5 s to display them.

> **Tradeoff vs. Vercel KV:** Vercel KV *is* Upstash under the hood but requires linking a storage resource to your Vercel project in the dashboard. Using Upstash directly is identical at runtime and works without that linking step — just two env vars.

## Local development

1. Copy `.env.local.example` to `.env.local` and fill in all values (see below for where to find each one).
2. Install deps and run:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:3000

To test the webhook locally, use [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) to expose `localhost:3000` and paste the tunnel URL into Meta's webhook config.

## Environment variables

| Variable | Where to find it |
|---|---|
| `ACCESS_TOKEN` | Meta App Dashboard → WhatsApp → API Setup → Temporary or permanent token |
| `PHONE_NUMBER_ID` | Meta App Dashboard → WhatsApp → API Setup → Phone Number ID |
| `WEBHOOK_VERIFY_TOKEN` | Any string you choose — must match what you enter in Meta Webhooks config |
| `APP_SECRET` | Meta App Dashboard → App Settings → Basic → App Secret |
| `UPSTASH_REDIS_REST_URL` | [Upstash console](https://console.upstash.com) → your database → REST API → UPSTASH_REDIS_REST_URL |
| `UPSTASH_REDIS_REST_TOKEN` | Same place → UPSTASH_REDIS_REST_TOKEN |

## Deploy to Vercel

1. Push this repo to GitHub (or any Git provider).
2. Import it in the [Vercel dashboard](https://vercel.com/new) and deploy.
3. In **Project Settings → Environment Variables**, add all six variables from the table above.
4. Your webhook URL will be:
   ```
   https://<your-project>.vercel.app/api/webhook
   ```
5. In **Meta App Dashboard → WhatsApp → Configuration → Webhook**, paste that URL and your `WEBHOOK_VERIFY_TOKEN`. Click "Verify and Save". Meta will send a GET with `hub.challenge`; the app returns it and verification passes.
6. Subscribe to the **messages** field under Webhook Fields.

Alternatively, deploy directly from the CLI:
```
npx vercel
```
Set env vars with `vercel env add` or in the dashboard after deployment.

## Errors are shown, not swallowed

`/api/send` returns the full Meta API response — including error objects with codes like `131037` (recipient not opted in), `100` (invalid param), etc. These appear as raw JSON directly in the UI. Nothing is hidden.

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/webhook` | Meta verification handshake |
| `POST` | `/api/webhook` | Receive incoming messages |
| `POST` | `/api/send` | Send a text message — body: `{ to, message }` |
| `GET` | `/api/messages` | Return last 50 stored messages (newest first) |
