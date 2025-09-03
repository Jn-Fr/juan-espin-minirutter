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
      const data = getProducts();
      writeJson("outputs/products.unified.json", data);
      return;
    }
    case "get-orders": {
      ensureOutputsDir();
      const data = getOrders();
      writeJson("outputs/orders.unified.json", data);
      return;
    }
    default: {
      console.log(`Usage:
        npm run sync:products
        npm run sync:orders
        npm run get:products
        npm run get:orders
      `);
    }
  }
}


main().catch((err) => {
  console.log(err);
  process.exit(1);
})