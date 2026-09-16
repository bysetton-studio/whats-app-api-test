import crypto from "crypto";
import { pushMessage } from "@/lib/db";

// GET — Meta webhook verification handshake
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("[webhook] Verification handshake OK");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[webhook] Verification failed — token mismatch or wrong mode");
  return new Response("Forbidden", { status: 403 });
}

// POST — incoming messages from Meta
export async function POST(request) {
  const rawBody = await request.text();

  // Signature check (warn only — this is a test tool)
  const sig = request.headers.get("x-hub-signature-256");
  if (process.env.APP_SECRET) {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", process.env.APP_SECRET).update(rawBody).digest("hex");
    if (sig !== expected) {
      console.warn("[webhook] Signature mismatch — expected", expected, "got", sig);
    }
  } else {
    console.warn("[webhook] APP_SECRET not set, skipping signature verification");
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  // Walk the standard Meta webhook payload structure
  const entries = body?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      for (const msg of value?.messages ?? []) {
        const parsed = {
          id: msg.id,
          from: msg.from,
          timestamp: msg.timestamp,
          type: msg.type,
          text: msg.text?.body ?? null,
          raw: msg,
          receivedAt: Date.now(),
        };
        console.log("[webhook] Received message:", parsed);
        await pushMessage(parsed);
      }
    }
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
