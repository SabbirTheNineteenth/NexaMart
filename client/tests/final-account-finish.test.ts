import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/account/AccountWorkspace.module.css", import.meta.url), "utf8");

test("account feed responses stay scoped to the current authenticated session", () => {
  assert.match(workspace, /const accountRequestRef = useRef\(0\);/);
  assert.match(workspace, /const requestId = accountRequestRef\.current \+ 1;/);
  assert.match(workspace, /const isCurrentRequest = \(requestId: number\) => accountRequestRef\.current === requestId;/);
  assert.match(workspace, /const loadOrders = async \(requestId = accountRequestRef\.current, signal\?: AbortSignal\)/);
  assert.match(workspace, /getJSON<\{ orders: CustomerOrder\[\] \}>\("\/checkout\/orders", signal\)/);
  assert.match(workspace, /if \(!isCurrentRequest\(requestId\)\) return;/);
  assert.match(workspace, /const controller = new AbortController\(\);/);
  assert.match(workspace, /getJSON<\{ account: Account \}>\("\/auth\/me", controller\.signal\)/);
  assert.match(workspace, /controller\.abort\(\);/);
});

test("account keeps each real feed recoverable and adds local keyboard and narrow-layout support", () => {
  assert.match(workspace, /Skip to account content/);
  assert.match(workspace, /id="account-content" className=\{styles\.content\} tabIndex=\{-1\}/);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /Retry loading orders/);
  assert.match(workspace, /Retry loading addresses/);
  assert.match(workspace, /Retry loading saved pieces/);
  assert.match(workspace, /No orders have been placed from this account yet\./);
  assert.match(workspace, /No shipping addresses have been saved to this account yet\./);
  assert.match(workspace, /No saved pieces are available for this account yet\./);
  assert.match(styles, /\.skipLink/);
  assert.match(styles, /\.content:focus/);
  assert.match(styles, /@media\(max-width:760px\)/);
});
