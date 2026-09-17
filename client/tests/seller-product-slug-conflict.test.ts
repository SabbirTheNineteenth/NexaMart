import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(new URL("../src/features/seller/SellerProductEditor.tsx", import.meta.url), "utf8");

test("seller product forms retain an editable slug and explain a server conflict", () => {
  assert.match(editor, /name="slug"/);
  assert.match(editor, /reason instanceof ApiError && reason.status === 409/);
  assert.match(editor, /Product slug already exists/);
});
