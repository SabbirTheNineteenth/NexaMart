import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const account = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/account/AccountWorkspace.module.css", import.meta.url), "utf8");

test("account routes customers to customer data and gives seller/admin sessions an explicit workspace transition", () => {
  assert.match(account, /if \(current\.role === "customer"\) \{[\s\S]*?void loadOrders[\s\S]*?void loadAddresses/);
  assert.match(account, /if \(account\.role === "seller"\) return <main[\s\S]*?You(?:'|&apos;)re signed in as a Seller[\s\S]*?href="\/seller"[\s\S]*?Open Seller workspace/);
  assert.match(account, /if \(account\.role === "admin"\) return <main[\s\S]*?You(?:'|&apos;)re signed in as an Admin[\s\S]*?href="\/admin"[\s\S]*?Open Admin workspace/);
  assert.doesNotMatch(account, /account\.role === "seller"[\s\S]{0,240}\/checkout\/orders/);
  assert.match(styles, /\.roleTransition[\s\S]*?min-height: 44px/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
