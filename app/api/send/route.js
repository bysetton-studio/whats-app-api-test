export async function POST(request) {
  const { to, message } = await request.json();

  if (!to || !message) {
    return new Response(JSON.stringify({ error: "Missing 'to' or 'message'" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const accessToken = process.env.ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return new Response(
      JSON.stringify({ error: "PHONE_NUMBER_ID or ACCESS_TOKEN env var not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  let metaResponse;
  let metaBody;
  try {
    metaResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
    metaBody = await metaResponse.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Return the full Meta response (including error codes like 131037) verbatim.
  return new Response(JSON.stringify({ status: metaResponse.status, body: metaBody }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
