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

type ShopifyProducts = { products: any[] };
type ShopifyOrders = { orders: any[] };

const MAX = 50;
const SOFT_DELAY = 300;

export async function syncProducts() {

  let next: string | undefined, total = 0;

  do {
    const q: Record<string, string> = { limit: String(MAX) };

    if (next) q.page_info = next;

    const { body, nextPageInfo } = await shopifyGet<ShopifyProducts>("products.json", q);

    for (const p of (body.products ?? [])) {
      upsertProduct.run({
        id: newId(),
        platform_id: String(p.id),
        name: p.title ?? ""
      });
      total++;
    }

    next = nextPageInfo;
    if (next) await sleep(SOFT_DELAY);

  } while (next);

  return total;

}

// Hasta 500 órdenes; si <50 pero hay next, usar limit=1 (regla del enunciado)
export async function syncOrders() {

  let next: string | undefined, total = 0, fetched = 0, limit = MAX;

  async function pageRun(pi?: string) {

    const q: Record<string, string> = { status: "any", limit: String(limit) };

    if (pi) q.page_info = pi;

    const { body, nextPageInfo } = await shopifyGet<ShopifyOrders>("orders.json", q);

    const orders = body.orders ?? [];

    const tx = db.transaction((batch: any[]) => {
      for (const o of batch) {
        const platform_id = String(o.id);

        // IMPORTANTE: usar .get() para capturar el RETURNING id
        const inserted = upsertOrder.get({ id: newId(), platform_id }) as { id: string } | undefined;

        // Si no insertó (porque ya existía), buscamos el id existente
        const row = inserted ?? (getOrderIdByPlatform.get(platform_id) as { id: string } | undefined);

        const orderId = row?.id;

        for (const li of (o.line_items ?? [])) {

          const platPid = li.product_id ? String(li.product_id) : null;

          let internalProdId: string | null = null;

          if (platPid) {
            const prod = findProductByPlatformId.get(platPid) as { id: string } | undefined;

            internalProdId = prod?.id ?? null;
          }

          insertLineItem.run(orderId, internalProdId, platPid);
        }
      }

    });

    tx(orders);

    fetched += orders.length;

    total += orders.length;

    return nextPageInfo;
  }

  // Probe inicial
  next = await pageRun(next);
  if (fetched < MAX && next) limit = 1; // aplica regla “fewer than 50 → 1 per call”

  while (next && fetched < 500) {
    next = await pageRun(next);
    if (next) await sleep(SOFT_DELAY);
  }

  return total;
}