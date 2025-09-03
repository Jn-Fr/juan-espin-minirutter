/**
 * Simple command-line interface:
 *   - sync-products: fetch + persist products
 *   - sync-orders:   fetch + persist orders and line items
 *   - get-products:  export Product[]  -> outputs/products.unified.json
 *   - get-orders:    export Order[]    -> outputs/orders.unified.json
 *
 * Notes:
 *   - Loads environment variables via dotenv
 *   - Creates outputs/ directory if necessary
 *   - Prints usage for unknown commands
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { mkdirSync, writeFileSync } from 'node:fs';
import { syncProducts, syncOrders } from './sync';
import { getProducts, getOrders } from './getters';

function ensureOutputsDir() {
  mkdirSync("outputs", { recursive: true });
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  console.log(`${path} written`);
}

async function main() {
  const cmd = process.argv[2];

  try {
    switch (cmd) {
      case "sync-products": {
        const n = await syncProducts();
        console.log(`Synced products: ${n}`);
        return;
      }
      case "sync-orders": {
        const n = await syncOrders();
        console.log(`Synced orders: ${n}`);
        return;
      }
      case "get-products": {
        ensureOutputsDir();
        writeJson("outputs/products.unified.json", getProducts());
        return;
      }
      case "get-orders": {
        ensureOutputsDir();
        writeJson("outputs/orders.unified.json", getOrders());
        return;
      }
      default: {
        process.exitCode = 1;
        console.log(`Usage:
          npm run sync:products
          npm run sync:orders
          npm run get:products
          npm run get:orders
      `);
      }
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();