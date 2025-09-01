import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

export const db = new Database("minirutter.db");

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

export const upsertProduct = db.prepare(`
  INSERT INTO products (id, platform_id, name)
  VALUES (@id, @platform_id, @name)
  ON CONFLICT(platform_id) DO UPDATE SET name=excluded.name
  RETURNING id;
`);

export const findProductByPlatformId = db.prepare(`
  SELECT id FROM products WHERE platform_id = ?;
`);

export const upsertOrder = db.prepare(`
  INSERT INTO orders (id, platform_id)
  VALUES (@id, @platform_id)
  ON CONFLICT(platform_id) DO NOTHING
  RETURNING id;
`);

export const getOrderIdByPlatform = db.prepare(`
  SELECT id FROM orders WHERE platform_id = ?;
`);

export const insertLineItem = db.prepare(`
  INSERT INTO order_line_items (order_id, product_id, platform_product_id)
  VALUES (?, ?, ?);
`);

export function newId() { return randomUUID(); }