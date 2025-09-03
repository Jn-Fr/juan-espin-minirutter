/**
 * db.ts
 *
 * SQLite schema + prepared statements.
 *
 * - Persists Shopify products and orders locally
 * - Links order line-items to stored products (or null if missing)
 * - Keeps Shopify IDs ("platform_id") separate from internal UUIDs
 */

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

export const db = new Database("minirutter.db");

// --- Schema ---------------------------------

// Pragmas: WAL for better concurrency; enforce foreign key constraints.

/**
 * products
 * - id: internal UUID (our own identifier)
 * - platform_id: Shopify product.id (unique)
 * - name: product title
 *
 *  * orders
 * - id: internal UUID
 * - platform_id: Shopify order.id (unique)
 *
 *  * order_line_items
 * - order_id: FK → orders.id
 * - product_id: FK → products.id (nullable if product not stored)
 * - platform_product_id: Shopify product_id (kept for traceability)
 */


db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    platform_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    platform_id TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_line_items (
    order_id TEXT NOT NULL,
    product_id TEXT NULL,
    platform_product_id TEXT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// --- Prepared statements -----------------------------------------------------

/**
 * Insert or update a product by platform_id.
 * RETURNING id lets us immediately get the internal UUID.
 */
export const upsertProduct = db.prepare(`
  INSERT INTO products (id, platform_id, name)
  VALUES (@id, @platform_id, @name)
  ON CONFLICT(platform_id) DO UPDATE SET name=excluded.name
  RETURNING id;
`);

/**
 * Lookup internal product.id from a Shopify product_id.
 */
export const findProductByPlatformId = db.prepare(`
  SELECT id FROM products WHERE platform_id = ?;
`);

/**
 * Insert an order by platform_id (do nothing on conflict).
 * RETURNING id if the row was newly inserted.
 */
export const upsertOrder = db.prepare(`
  INSERT INTO orders (id, platform_id)
  VALUES (@id, @platform_id)
  ON CONFLICT(platform_id) DO NOTHING
  RETURNING id;
`);

/**
 * Lookup internal order.id from a Shopify order_id.
 */
export const getOrderIdByPlatform = db.prepare(`
  SELECT id FROM orders WHERE platform_id = ?;
`);

/**
 * Insert a line item row linked to an order.
 * product_id is nullable if we don’t have the product stored.
 */
export const insertLineItem = db.prepare(`
  INSERT INTO order_line_items (order_id, product_id, platform_product_id)
  VALUES (?, ?, ?);
`);

/** Generate a new internal UUID (used for products.id / orders.id). */
export function newId() { return randomUUID(); }