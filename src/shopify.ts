import { request } from "undici";
import * as dotenv from "dotenv";
dotenv.config();

const BASE = process.env.SHOPIFY_BASE_URL!;
const TOKEN = process.env.SHOPIFY_TOKEN!;
const VER = process.env.SHOPIFY_API_VERSION || "2022-04";

function buildUrl(path: string, query?: Record<string, string>) {
  const u = new URL(`${BASE}/admin/api/${VER}/${path}`);

  if (query) for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

export async function shopifyGet<T>(path: string, query: Record<string, string>) {
  const res = await request(buildUrl(path, query), {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json"
    }
  });

  const body = await res.body.json();
  const link = (res.headers as any)["link"] || (res.headers as any)["Link"];
  let nextPageInfo: string | undefined;

  if (typeof link === "string") {
    // Search rel="next" and extract page_info
    const m = link.match(/<[^>]*[?&]page_info=([^>]+)>;\s*rel="next"/i);
    if (m) nextPageInfo = decodeURIComponent(m[1]);
  }

  return { body: body as T, nextPageInfo };
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));