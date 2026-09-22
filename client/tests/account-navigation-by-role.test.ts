import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("account navigation maps every session role in shared and Storefront headers", async () => {
  const { accountDestination, accountDestinationLabel } = await import("../src/features/account/account-destination.js");
  assert.equal(accountDestination("customer"), "/account");
  assert.equal(accountDestination("seller"), "/seller");
  assert.equal(accountDestination("admin"), "/admin");
  assert.equal(accountDestination(null), "/account");
  assert.equal(accountDestinationLabel("seller"), "Open seller workspace");
  const explore = readFileSync(new URL("../src/components/ExploreHeader.tsx", import.meta.url), "utf8");
  const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
  assert.match(explore, /accountDestination\(cart\.accountRole\)/);
  assert.match(storefront, /accountDestination\(cart\.accountRole\)/);
  assert.match(explore, /onClick=\{\(\) => setMobileNavOpen\(false\)\}/);
  assert.match(storefront, /onClick=\{\(\) => setMobileNavOpen\(false\)\}/);
});
