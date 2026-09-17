import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createCartQuantityMutation, type CartQuantityUpdate } from "../src/hooks/useCart";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");

type Deferred = { promise: Promise<void>; resolve: () => void; reject: (reason: Error) => void };

function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("quantity mutation accepts only one in-flight request per cart line", async () => {
  const firstRequest = deferred();
  const requests: { id: string; quantity: number }[] = [];
  const actions: unknown[] = [];
  const updates = new Map<string, CartQuantityUpdate | undefined>();
  const mutation = createCartQuantityMutation({
    authenticated: true,
    patchQuantity: async (id, quantity) => {
      requests.push({ id, quantity });
      await firstRequest.promise;
    },
    dispatch: (action) => actions.push(action),
    setUpdate: (id, update) => updates.set(id, update),
  });

  const first = mutation.setQuantity("line-1", 2);
  await Promise.resolve();
  const overlapping = mutation.setQuantity("line-1", 3);

  assert.deepEqual(requests, [{ id: "line-1", quantity: 2 }]);
  assert.deepEqual(updates.get("line-1"), { state: "pending" });
  await overlapping;
  assert.deepEqual(actions, []);

  firstRequest.resolve();
  await first;
  assert.deepEqual(actions, [{ type: "setQuantity", id: "line-1", quantity: 2 }]);
  assert.equal(updates.get("line-1"), undefined);
});

test("failed quantity mutation keeps a per-line error and retries the requested quantity", async () => {
  const requests: { id: string; quantity: number }[] = [];
  const actions: unknown[] = [];
  const updates = new Map<string, CartQuantityUpdate | undefined>();
  let attempt = 0;
  const mutation = createCartQuantityMutation({
    authenticated: true,
    patchQuantity: async (id, quantity) => {
      requests.push({ id, quantity });
      attempt += 1;
      if (attempt === 1) throw new Error("Quantity service unavailable");
    },
    dispatch: (action) => actions.push(action),
    setUpdate: (id, update) => updates.set(id, update),
  });

  await assert.rejects(mutation.setQuantity("line-1", 4), /Quantity service unavailable/);
  assert.deepEqual(updates.get("line-1"), { state: "error", message: "Quantity service unavailable" });
  assert.deepEqual(actions, []);

  await mutation.retryQuantity("line-1");
  assert.deepEqual(requests, [{ id: "line-1", quantity: 4 }, { id: "line-1", quantity: 4 }]);
  assert.deepEqual(actions, [{ type: "setQuantity", id: "line-1", quantity: 4 }]);
  assert.equal(updates.get("line-1"), undefined);
});

test("shopping bag presents isolated busy controls and an item-level quantity retry", () => {
  assert.match(storefront, /const quantityUpdate = cart\.quantityUpdates\[item\.id\];/);
  assert.match(storefront, /aria-busy=\{cart\.removingItemId === item\.id \|\| quantityUpdate\?\.state === "pending"\}/);
  assert.match(storefront, /disabled=\{quantityUpdate\?\.state === "pending"\}/);
  assert.match(storefront, /Updating…/);
  assert.match(storefront, /quantityUpdate\.message/);
  assert.match(storefront, /cart\.retryQuantity\(item\.id\)/);
  assert.doesNotMatch(storefront, /cart\.setQuantity\([^\n]+\.catch\([^\n]+setError/);
});
