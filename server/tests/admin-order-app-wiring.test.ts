import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");

test("application wires protected Admin COD operations before dashboard routes", () => {
  assert.match(source, /import \{ createAdminOrderRoutes \} from "\.\/modules\/admin\/admin-order\.routes\.js"/);
  assert.match(source, /import \{ PostgresAdminOrderRepository \} from "\.\/modules\/admin\/postgres-admin-order\.repository\.js"/);
  assert.match(source, /import \{ AdminOrderService \} from "\.\/modules\/admin\/services\/admin-order-service\.js"/);
  assert.match(source, /const adminOrderService = new AdminOrderService\(new PostgresAdminOrderRepository\(\)\)/);
  assert.match(source, /app\.route\("\/admin\/orders", createAdminOrderRoutes\(\{ sessions: sessionService, orders: adminOrderService, operations: codOperations \}\)\)[\s\S]*app\.route\("\/admin", createAdminRoutes/);
});
