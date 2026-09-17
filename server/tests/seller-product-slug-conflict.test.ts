import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = readFileSync(new URL("../src/modules/seller/seller.routes.ts", import.meta.url), "utf8");

test("seller product create and edit map a database slug conflict to the safe 409 contract", () => {
  const create = routes.slice(routes.indexOf('routes.post("/products"'), routes.indexOf("return routes"));
  const edit = routes.slice(routes.indexOf('routes.patch("/products/:productId"'), routes.indexOf('routes.post("/products"'));
  assert.match(create, /isUniqueViolation\(error\).*Product slug already exists.*409/);
  assert.match(edit, /isUniqueViolation\(error\).*Product slug already exists.*409/);
});
