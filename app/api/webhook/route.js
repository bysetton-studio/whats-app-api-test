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

// Fetches a random GIF MP4 URL from Giphy. Returns null if unavailable.
async function fetchRandomGif() {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/random?api_key=${apiKey}&rating=g`
    );
    const data = await res.json();
    return data.data?.images?.original?.url ?? null;
  } catch (err) {
    console.warn("[webhook] Giphy fetch failed:", err.message);
    return null;
  }
}

// Returns the error object if the reply failed, or null on success.
async function sendReply(to) {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const accessToken = process.env.ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    const err = { message: "PHONE_NUMBER_ID or ACCESS_TOKEN not set" };
    console.warn("[webhook] Cannot send reply —", err.message);
    return err;
  }

  const gifUrl = await fetchRandomGif();

  let payload;
  if (gifUrl) {
    console.log("[webhook] Replying with GIF:", gifUrl);
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "video",
      video: { link: gifUrl },
    };
  } else {
    console.log("[webhook] No GIF available, falling back to text reply");
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: "Thanks for replying, send us another message please" },
    };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.error) {
    console.error("[webhook] Auto-reply failed — code:", data.error.code, "message:", data.error.message, "full:", JSON.stringify(data.error));
    return data.error;
  }
  console.log("[webhook] Auto-reply sent OK:", data);
  return null;
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
        const replyError = await sendReply(msg.from);
        const parsed = {
          id: msg.id,
          from: msg.from,
          timestamp: msg.timestamp,
          type: msg.type,
          text: msg.text?.body ?? null,
          raw: msg,
          receivedAt: Date.now(),
          replyError: replyError ?? null,
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
