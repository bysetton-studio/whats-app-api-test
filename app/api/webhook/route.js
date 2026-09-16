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

// Fetches a random GIF URL from Giphy. Returns null if unavailable.
async function fetchRandomGif() {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    console.warn("[giphy] GIPHY_API_KEY not set — skipping GIF");
    return null;
  }
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/random?api_key=${apiKey}&rating=g`
    );
    console.log("[giphy] HTTP status:", res.status);
    const data = await res.json();
    console.log("[giphy] Full response:", JSON.stringify(data).slice(0, 500));
    const url = data.data?.images?.original_mp4?.mp4 ?? data.data?.images?.original?.url ?? null;
    console.log("[giphy] Resolved URL:", url);
    return url;
  } catch (err) {
    console.error("[giphy] Fetch threw:", err.message);
    return null;
  }
}

// Returns the error object if the reply failed, or null on success.
async function sendReply(to) {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const accessToken = process.env.ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    const err = { message: "PHONE_NUMBER_ID or ACCESS_TOKEN not set" };
    console.warn("[reply] Cannot send reply —", err.message);
    return err;
  }

  let gifUrl;
  try {
    gifUrl = await fetchRandomGif();
  } catch (err) {
    console.error("[reply] fetchRandomGif threw unexpectedly:", err.message);
    gifUrl = null;
  }

  let payload;
  if (gifUrl) {
    console.log("[reply] Sending GIF to", to, "url:", gifUrl);
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "video",
      video: { link: gifUrl },
    };
  } else {
    console.log("[reply] No GIF — sending text fallback to", to);
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: "Thanks for replying, send us another message please" },
    };
  }

  console.log("[reply] Payload:", JSON.stringify(payload));

  let res, data;
  try {
    res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    data = await res.json();
  } catch (err) {
    console.error("[reply] fetch to Meta threw:", err.message);
    return { message: err.message };
  }

  console.log("[reply] Meta HTTP status:", res.status, "body:", JSON.stringify(data));
  if (data.error) {
    console.error("[reply] Auto-reply failed — code:", data.error.code, "subcode:", data.error.error_subcode, "message:", data.error.message);
    return data.error;
  }
  console.log("[reply] Sent OK");
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
