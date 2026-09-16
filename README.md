# WhatsApp Cloud API Test Tool

Minimal Next.js app for testing WhatsApp Cloud API webhook delivery and message sending. Designed for Vercel.

## Storage: Neon (Postgres)

Vercel serverless functions are stateless — an in-memory array disappears after each request. This tool uses **Neon** (serverless Postgres) to persist incoming messages. The table is created automatically on first use (`CREATE TABLE IF NOT EXISTS`), so there's no manual migration step.

## Local development

1. Fill in `.env.local` (see env var table below).
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
| `POSTGRES_URL` | See below |

### Getting POSTGRES_URL

**On Vercel (recommended):** In your project dashboard → **Storage** → **Create Database** → select **Neon**. Vercel automatically injects `POSTGRES_URL` (and others) into your deployment environment — no manual copy-paste needed.

**For local dev:** Go to [console.neon.tech](https://console.neon.tech), open your database → **Connection Details** → copy the **Connection string** (pooled). Paste it as `POSTGRES_URL` in `.env.local`.

## Deploy to Vercel

1. Push this repo to GitHub (or any Git provider).
2. Import it in the [Vercel dashboard](https://vercel.com/new) and deploy.
3. In your project → **Storage** → **Create Database** → **Neon** — this auto-wires `POSTGRES_URL`.
4. In **Project Settings → Environment Variables**, add the four WhatsApp vars (`ACCESS_TOKEN`, `PHONE_NUMBER_ID`, `WEBHOOK_VERIFY_TOKEN`, `APP_SECRET`).
5. Your webhook URL will be:
   ```
   https://<your-project>.vercel.app/api/webhook
   ```
6. In **Meta App Dashboard → WhatsApp → Configuration → Webhook**, paste that URL and your `WEBHOOK_VERIFY_TOKEN`. Click "Verify and Save". Meta sends a GET with `hub.challenge`; the app returns it and verification passes.
7. Subscribe to the **messages** field under Webhook Fields.

Alternatively, deploy directly from the CLI:
```
npx vercel
```

## Errors are shown, not swallowed

`/api/send` returns the full Meta API response — including error objects with codes like `131037` (recipient not opted in), `100` (invalid param), etc. These appear as raw JSON directly in the UI. Nothing is hidden.

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/webhook` | Meta verification handshake |
| `POST` | `/api/webhook` | Receive incoming messages |
| `POST` | `/api/send` | Send a text message — body: `{ to, message }` |
| `GET` | `/api/messages` | Return last 50 stored messages (newest first) |
