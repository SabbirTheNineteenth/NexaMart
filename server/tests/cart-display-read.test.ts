import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("persistent cart reads join product display fields", () => {
  const source = readFileSync(new URL("../src/modules/cart/postgres-cart.repository.ts", import.meta.url), "utf8");
  assert.match(source, /innerJoin\(products,/);
  assert.match(source, /name: products\.name/);
  assert.match(source, /coalesce\(\$\{productVariants\.price\}, \$\{products\.price\}\)/);
  assert.match(source, /leftJoin\(productVariants,/);
  assert.match(source, /image: products\.primaryImageUrl/);
});
