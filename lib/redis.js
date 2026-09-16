import { Redis } from "@upstash/redis";

const KEY = "wa:messages";
const MAX_MESSAGES = 200;

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. " +
        "Create a free database at https://upstash.com and paste the REST credentials into .env.local"
    );
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function pushMessage(msg) {
  const redis = getRedis();
  // LPUSH keeps newest first; trim so the list doesn't grow unbounded.
  await redis.lpush(KEY, JSON.stringify(msg));
  await redis.ltrim(KEY, 0, MAX_MESSAGES - 1);
}

export async function getMessages(count = 50) {
  const redis = getRedis();
  const raw = await redis.lrange(KEY, 0, count - 1);
  return raw.map((item) => (typeof item === "string" ? JSON.parse(item) : item));
}
