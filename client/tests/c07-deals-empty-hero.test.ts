import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const deals = readFileSync(new URL("../src/features/catalog/DealsDiscovery.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/DealsDiscovery.module.css", import.meta.url), "utf8");

test("C07 keeps the no-result hero visually neutral without inventing a featured deal", () => {
  assert.match(deals, /import styles from "\.\/DealsDiscovery\.module\.css";/);
  assert.match(deals, /className=\{`storefront-skip-link \$\{styles\.skipLink\}`\}/);
  assert.match(styles, /:global\(\.deals-discovery \.hero-placeholder\)/);
  assert.match(styles, /color: transparent;/);
  assert.match(styles, /font-size: 0;/);
});
