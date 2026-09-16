export async function GET() {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const accessToken = process.env.ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return new Response(
      JSON.stringify({ error: "PHONE_NUMBER_ID or ACCESS_TOKEN not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let res, data;
  try {
    res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,name_status,quality_rating,display_phone_number,status`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    data = await res.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
