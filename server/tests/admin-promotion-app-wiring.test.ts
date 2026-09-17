import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");

test("application wires the protected read-only admin promotion oversight endpoint before dashboard routes", () => {
  assert.match(source, /import \{ createAdminPromotionRoutes \} from "\.\/modules\/admin\/admin-promotion\.routes\.js"/);
  assert.match(source, /import \{ PostgresAdminPromotionRepository \} from "\.\/modules\/admin\/postgres-admin-promotion\.repository\.js"/);
  assert.match(source, /import \{ AdminPromotionService \} from "\.\/modules\/admin\/services\/admin-promotion-service\.js"/);
  assert.match(source, /const adminPromotionService = new AdminPromotionService\(new PostgresAdminPromotionRepository\(\)\)/);
  assert.match(source, /app\.route\("\/admin\/promotions", createAdminPromotionRoutes\(\{ sessions: sessionService, promotions: adminPromotionService \}\)\)[\s\S]*app\.route\("\/admin", createAdminRoutes/);
});
