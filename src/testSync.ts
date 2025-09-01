import { syncProducts, syncOrders } from "./sync.js";
import { db } from "./db.js";

async function main() {
  console.log("=== Sync Products ===");
  const prodCount = await syncProducts();
  console.log(`Products synced: ${prodCount}`);

  console.log("=== Sync Orders ===");
  const orderCount = await syncOrders();
  console.log(`Orders synced: ${orderCount}`);

  // Verifica cuántos productos/órdenes hay en DB
  const rows = db.prepare("SELECT COUNT(*) as c FROM products").get();
  console.log("Products in DB:", rows);

  const rows2 = db.prepare("SELECT COUNT(*) as c FROM orders").get();
  console.log("Orders in DB:", rows2);
}

main().catch(console.error);
