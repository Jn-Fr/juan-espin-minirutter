import { db } from "./db";
import type { Product, Order } from "./types";

export function getProducts(): Product[] {
  const rows = db
    .prepare(`SELECT id, platform_id, name FROM products ORDER BY name`)
    .all();
  return rows as Product[];
}

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
      line_items: items.map((i) => ({ product_id: i.product_id ?? null }))
    }
  })
}