// Uses `undici` (lightweight, native HTTP client) instead of a heavy SDK
import { request } from "undici";

import * as dotenv from "dotenv";
dotenv.config();

const BASE = process.env.SHOPIFY_BASE_URL!;
const TOKEN = process.env.SHOPIFY_TOKEN!;
const VER = process.env.SHOPIFY_API_VERSION || "2022-04";

/**
 * Build a Shopify API URL with query parameters.
 * Example: https://{store}/admin/api/{VER}/products.json?limit=50&page_info=...
 */
function buildUrl(path: string, query?: Record<string, string>) {
  const url = new URL(`${BASE}/admin/api/${VER}/${path}`);

  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return url.toString();
}

/**
 * Perform an authenticated GET request to Shopify.
 *
 * @param path  e.g., "products.json" or "orders.json"
 * @param query query parameters (limit, page_info, etc.)
 * @returns body (typed as generic T) and nextPageInfo (string cursor or undefined)
 *
 * Notes:
 * - Uses the `X-Shopify-Access-Token` header for authentication
 * - Extracts `page_info` from the Link header (`rel="next"`)
 * - Returns both the response body and the next cursor so the caller can loop
 */
export async function shopifyGet<T>(path: string, query: Record<string, string>) {
  const res = await request(buildUrl(path, query), {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json"
    }
  });

  const body = await res.body.json();

  // Pagination handling via Link header
  const link = (res.headers as any)["link"] || (res.headers as any)["Link"];
  let nextPageInfo: string | undefined;

  if (typeof link === "string") {
    // Example header: <...page_info=XYZ>; rel="next"
    const match = link.match(/<[^>]*[?&]page_info=([^>]+)>;\s*rel="next"/i);
    // Capture de value of match[1] e.g 'XYZ'
    if (match) nextPageInfo = decodeURIComponent(match[1]);
  }

  return { body: body as T, nextPageInfo };
}

/**
 * Simple sleep utility.
 * Helps avoid hitting Shopify rate limits when paginating.
 *
 * @param ms number of milliseconds to wait
 */
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));