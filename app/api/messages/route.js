import { getMessages } from "@/lib/db";

export async function GET() {
  const messages = await getMessages(50);
  return new Response(JSON.stringify(messages), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
