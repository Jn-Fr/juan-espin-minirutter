import { shopifyGet, sleep } from "./shopify";
import {
  db,
  newId,
  upsertProduct,
  upsertOrder,
  insertLineItem,
  findProductByPlatformId,
  getOrderIdByPlatform,
} from "./db";

type ShopifyProductsResponse = { products: any[] };
type ShopifyOrdersResponse = { orders: any[] };

const MAX_PER_REQUEST = 50;
const SOFT_DELAY = 300;


/**
 * Fetch and persist all products from Shopify (paginated).
 * Returns the number of products processed.
 */
export async function syncProducts() {

  let nextCursor: string | undefined;
  let totalProcessed = 0;

  do {
    const query: Record<string, string> = { limit: String(MAX_PER_REQUEST) };

    if (nextCursor) query.page_info = nextCursor;

    const { body, nextPageInfo } = await shopifyGet<ShopifyProductsResponse>("products.json", query);

    const products = body.products ?? [];

    // Upsert each product by platform_id; keep an internal UUID id
    for (const p of products) {
      upsertProduct.run({
        id: newId(),
        platform_id: String(p.id),
        name: p.title ?? ""
      });
      totalProcessed++;
    }

    nextCursor = nextPageInfo;
    if (nextCursor) await sleep(SOFT_DELAY);

  } while (nextCursor);

  return totalProcessed;

}

/**
 * Fetch and persist up to 500 orders from Shopify (paginated).
 * Special rule: If the first page returns <50 orders but has a next page, switch to limit=1 afterward.
 * Returns the number of orders processed.
 */
export async function syncOrders() {

  let nextCursor: string | undefined;
  let totalProcessed = 0;
  let fetchedCount = 0;

  // Start with the maximum allowed per call
  let itemsLimit = MAX_PER_REQUEST;

  // Processes one page: fetch, persist, link line items.
  async function pageRun(cursor?: string) {

    const query: Record<string, string> = { status: "any", limit: String(itemsLimit) };

    if (cursor) query.page_info = cursor;

    const { body, nextPageInfo } = await shopifyGet<ShopifyOrdersResponse>("orders.json", query);

    const orders = body.orders ?? [];

    // Page-level transaction for consistency
    const tx = db.transaction((batch: any[]) => {
      for (const o of batch) {
        const platformOrderId = String(o.id);

        // Insert order (do nothing if exists); retrieve internal id
        const inserted = upsertOrder.get({ id: newId(), platform_id: platformOrderId }) as { id: string } | undefined;

        // If not inserted (because it already existed), we search for the existing id
        const orderRow = inserted ?? (getOrderIdByPlatform.get(platformOrderId) as { id: string } | undefined);

        const internalOrderId = orderRow?.id;

        // For each line item, resolve internal product id (or null)
        for (const li of (o.line_items ?? [])) {

          const platformProductId = li.product_id ? String(li.product_id) : null;

          let internalProductId: string | null = null;

          if (platformProductId) {
            const productRow = findProductByPlatformId.get(platformProductId) as { id: string } | undefined;

            internalProductId = productRow?.id ?? null;
          }

          insertLineItem.run(internalOrderId, internalProductId, platformProductId);
        }
      }

    });

    tx(orders);

    fetchedCount += orders.length;

    totalProcessed += orders.length;

    return nextPageInfo;
  }

  // Probe the first page (to decide whether we need to switch to limit=1)
  nextCursor = await pageRun(nextCursor);

  // If the first page returned fewer than 50 orders but a next page exists, switch to limit=1.
  if (fetchedCount < MAX_PER_REQUEST && nextCursor) {
    itemsLimit = 1;
  }

  // Continue until no more pages or we hit the 500-order cap
  while (nextCursor && fetchedCount < 500) {
    nextCursor = await pageRun(nextCursor);
    if (nextCursor) await sleep(SOFT_DELAY);
  }

  return totalProcessed;
}