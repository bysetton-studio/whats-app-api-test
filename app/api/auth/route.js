import crypto from "crypto";

function sessionToken() {
  return crypto
    .createHash("sha256")
    .update((process.env.AUTH_PASSWORD ?? "") + "-session")
    .digest("hex");
}

export async function POST(request) {
  const { password } = await request.json();

  if (!process.env.AUTH_PASSWORD || password !== process.env.AUTH_PASSWORD) {
    return new Response(JSON.stringify({ error: "Wrong password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = sessionToken();
  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  res.headers.set(
    "Set-Cookie",
    `session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800`
  );
  return res;
}

export async function DELETE() {
  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  res.headers.set(
    "Set-Cookie",
    "session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0"
  );
  return res;
}
