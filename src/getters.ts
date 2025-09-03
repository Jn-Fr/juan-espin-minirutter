import { db } from "./db";
import type { Product, Order } from "./types";

/**
 * Return all stored products in the unified shape.
 * Sorted by name for stable output (optional but convenient for reviewers).
 */
export function getProducts(): Product[] {
  const rows = db
    .prepare(`SELECT id, platform_id, name FROM products ORDER BY name`)
    .all();

  // Ensure the array matches the exact shape/type
  return rows as Product[];
}


/**
 * Return all stored orders in the unified shape.
 * For each order, gather its line_items and map to { product_id } where:
 * - product_id is the internal products.id if the product exists
 * - or null if not found (explicit requirement in the brief)
 */
export function getOrders(): Order[] {
  const orders = db
    .prepare(`SELECT id, platform_id FROM orders ORDER BY platform_id`)
    .all();

  const liStmt = db.prepare(
    `SELECT product_id FROM order_line_items WHERE order_id = ?`
  );

  return (orders as Array<{ id: string; platform_id: string }>).map((o) => {
    const items = liStmt.all(o.id) as Array<{ product_id: string | null }>;

    return {
      id: o.id,
      platform_id: o.platform_id,
      line_items: items.map((i) => ({
        // Explicitly coalesce to null to match the brief’s schema
        product_id: i.product_id ?? null,
      })),
    }
  })
}