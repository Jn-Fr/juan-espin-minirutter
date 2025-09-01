import * as dotenv from 'dotenv';
dotenv.config();

import { mkdirSync, writeFileSync } from 'node:fs';
import { syncProducts, syncOrders } from './sync';
import { getProducts, getOrders } from './getters';

async function main() {
  const cmd = process.argv[2];

  if (cmd === "sync-products") {
    const n = await syncProducts();
    console.log(`Synced products: ${n}`);
    return;
  }

  if (cmd === "sync-orders") {
    const n = await syncOrders();
    console.log(`Synced orders: ${n}`);
    return;
  }

  if (cmd === "get-products") {
    mkdirSync("outputs", { recursive: true });

    const data = getProducts();

    writeFileSync(
      "outputs/products.unified.json",
      JSON.stringify(data, null, 2),
      "utf8"
    )
    console.log("outputs/products.unified.json written!");
    return;
  }

  if (cmd === "get-orders") {
    mkdirSync("outputs", { recursive: true });
    const data = getOrders();
    writeFileSync(
      "outputs/orders.unified.json",
      JSON.stringify(data, null, 2),
      "utf8"
    );
    console.log("outputs/orders.unified.json written!");
    return;
  }

  console.log(`Usage:
  npm run sync:products
  npm run sync:orders
  npm run get:products
  npm run get:orders
  `);

}

main().catch((err) => {
  console.log(err);
  process.exit(1);
})