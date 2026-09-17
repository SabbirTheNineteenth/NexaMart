import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { migrateGuestCart } from "../src/hooks/useCart";
import type { CartItem } from "../src/features/cart/cart.reducer";

const cart = readFileSync(new URL("../src/hooks/useCart.ts", import.meta.url), "utf8");
const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

test("guest handoff posts every valid line with its product, variant, and quantity", async () => {
  const requests: unknown[] = [];

  await migrateGuestCart([
    { id: productId, quantity: 2 },
    { id: `${productId}::${variantId}`, productId, variantId, quantity: 3 },
    { id: "corrupt", quantity: 1 },
  ] as CartItem[], async (line) => { requests.push(line); });

  assert.deepEqual(requests, [
    { productId, quantity: 2 },
    { productId, variantId, quantity: 3 },
  ]);
});

test("a failed guest handoff retains completed progress so retry does not re-add a line", async () => {
  const completedLineIds = new Set<string>();
  const requests: unknown[] = [];
  let failSecond = true;
  const lines = [
    { id: productId, quantity: 2 },
    { id: `${productId}::${variantId}`, productId, variantId, quantity: 3 },
  ] as CartItem[];
  const add = async (line: unknown) => {
    requests.push(line);
    if (requests.length === 2 && failSecond) {
      failSecond = false;
      throw new Error("Cart service unavailable");
    }
  };

  await assert.rejects(migrateGuestCart(lines, add, completedLineIds), /Cart service unavailable/);
  assert.deepEqual(requests, [{ productId, quantity: 2 }, { productId, variantId, quantity: 3 }]);
  assert.deepEqual([...completedLineIds], [`${productId}::`]);

  await migrateGuestCart(lines, add, completedLineIds);
  assert.deepEqual(requests, [{ productId, quantity: 2 }, { productId, variantId, quantity: 3 }, { productId, variantId, quantity: 3 }]);
});

test("the hook confirms the session, preserves local storage on failure, and clears it only after handoff succeeds", () => {
  assert.match(cart, /await getJSON<\{ account: Account \}>\("\/auth\/me"\);[\s\S]*setAuthenticated\(true\);[\s\S]*await handoffGuestCart/);
  assert.match(cart, /await migrateGuestCart[\s\S]*window\.localStorage\.removeItem\(key\)/);
  assert.match(cart, /cartHandoffState[\s\S]*retryCartLoad/);
  assert.match(cart, /postJSON<void>\("\/cart\/items", line\)/);
});
