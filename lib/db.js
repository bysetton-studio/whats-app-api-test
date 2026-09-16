import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "Missing POSTGRES_URL. Connect a Neon database in Vercel Dashboard → Storage → Create Database."
    );
  }
  return neon(url);
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS wa_messages (
      id          SERIAL PRIMARY KEY,
      message_id  TEXT,
      sender      TEXT,
      ts          TEXT,
      type        TEXT,
      text        TEXT,
      raw         JSONB,
      received_at BIGINT
    )
  `;
}

export async function pushMessage(msg) {
  const sql = getSql();
  await ensureTable(sql);
  await sql`
    INSERT INTO wa_messages (message_id, sender, ts, type, text, raw, received_at)
    VALUES (
      ${msg.id},
      ${msg.from},
      ${msg.timestamp},
      ${msg.type},
      ${msg.text ?? null},
      ${JSON.stringify(msg.raw)},
      ${msg.receivedAt}
    )
  `;
  // Keep only the latest 200 messages
  await sql`
    DELETE FROM wa_messages
    WHERE id NOT IN (
      SELECT id FROM wa_messages ORDER BY received_at DESC LIMIT 200
    )
  `;
}

export async function getMessages(count = 50) {
  const sql = getSql();
  await ensureTable(sql);
  const rows = await sql`
    SELECT message_id AS id, sender AS "from", ts AS timestamp, type, text, raw, received_at AS "receivedAt"
    FROM wa_messages
    ORDER BY received_at DESC
    LIMIT ${count}
  `;
  return rows;
}
