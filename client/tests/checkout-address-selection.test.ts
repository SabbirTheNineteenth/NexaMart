import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectShippingAddressId, type CheckoutShippingAddress } from "../src/features/cart/checkout-address-selection";

const addresses: CheckoutShippingAddress[] = [
  { id: "home", recipientName: "Ari Rahman", phone: "01700000000", line1: "8 Lake Road", city: "Dhaka", country: "BD", isDefault: false },
  { id: "office", recipientName: "Ari Rahman", phone: "01700000000", line1: "21 Tower Avenue", city: "Dhaka", country: "BD", isDefault: true },
];
const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("saved-address selection defaults to the default address and otherwise the first address", () => {
  assert.equal(selectShippingAddressId(addresses, null), "office");
  assert.equal(selectShippingAddressId([{ ...addresses[0], isDefault: false }], null), "home");
});

test("saved-address selection remains stable across a refetch while the selection exists", () => {
  assert.equal(selectShippingAddressId(addresses, "home"), "home");
  assert.equal(selectShippingAddressId([addresses[1]], "home"), "office");
});

test("checkout drawer loads and exposes named selectable saved addresses with recoverable states", () => {
  assert.match(storefront, /getJSON<\{ addresses: ShippingAddress\[\] \}>\("\/addresses\/", controller\.signal\)/);
  assert.match(storefront, /<fieldset className="checkout-addresses"[\s\S]*?<legend>Shipping address<\/legend>/);
  assert.match(storefront, /type="radio" name="shipping-address"/);
  assert.match(storefront, /aria-label=\{`Ship to \$\{address\.recipientName\}, \$\{address\.line1\}, \$\{address\.city\}`\}/);
  assert.match(storefront, /Loading saved addresses…/);
  assert.match(storefront, /You have no saved shipping addresses\. Add one in Account before placing an order\./);
  assert.match(storefront, /Unable to load saved addresses\. Try again\./);
  assert.match(storefront, /Retry saved addresses/);
});

test("checkout cannot post without the selected saved address and posts that explicit id", () => {
  assert.match(storefront, /if \(!selectedShippingAddressId\) \{/);
  assert.match(storefront, /Choose a saved shipping address before placing your order\./);
  assert.match(storefront, /checkoutPayload\(cart\.items, selectedShippingAddressId\)/);
  assert.doesNotMatch(storefront, /const \{ addresses \} = await getJSON/);
});

test("checkout action is available only to an authenticated customer with a selected loaded saved address", () => {
  assert.match(storefront, /const checkoutAvailable = cart\.authenticated && addressLoadState === "loaded" && savedAddresses\.length > 0 && Boolean\(selectedShippingAddressId\);/);
  assert.match(storefront, /<button className="primary-button full" disabled=\{!checkoutAvailable \|\| checkoutPending\}/);
  assert.match(storefront, /Sign in from Account to select a shipping address and place your order\./);
});

test("unavailable address states keep specific inline recovery guidance instead of attempting checkout", () => {
  assert.match(storefront, /if \(addressLoadState === "idle"\) \{/);
  assert.match(storefront, /Saved addresses are still loading\. Wait for them before placing your order\./);
  assert.match(storefront, /if \(addressLoadState === "error"\) \{/);
  assert.match(storefront, /Unable to load saved addresses\. Retry saved addresses before placing your order\./);
  assert.match(storefront, /if \(savedAddresses\.length === 0\) \{/);
  assert.match(storefront, /Add a saved shipping address in Account before placing your order\./);
  assert.match(storefront, /checkoutAvailable\) return;/);
});

test("saved-address choices remain visibly grouped and clickable in the checkout drawer", () => {
  assert.match(styles, /\.checkout-addresses\{/);
  assert.match(styles, /\.checkout-address-option\{/);
});

test("checkout retains its idempotency key and gives confirmed-order cart-cleanup recovery when clearing fails", () => {
  assert.match(storefront, /const \[checkoutRecovery, setCheckoutRecovery\] = useState<\{ reference: string \} \| null>\(null\);/);
  assert.match(storefront, /const \{ order \} = await postJSON<[\s\S]*?\("\/checkout\/orders", checkoutPayload\(cart\.items, selectedShippingAddressId\), \{ "Idempotency-Key": idempotencyKey \}\);[\s\S]*?await cart\.clear\(\);[\s\S]*?checkoutKeyRef\.current = null;/);
  assert.match(storefront, /setCheckoutRecovery\(\{ reference: order\.reference \}\);/);
  assert.match(storefront, /Order \$\{order\.reference\} was created, but we could not clear your bag\./);
  assert.match(storefront, /Retry cart cleanup/);
  assert.match(storefront, /const retryCartCleanup = async \(\) => \{[\s\S]*?await cart\.clear\(\);[\s\S]*?checkoutKeyRef\.current = null;/);
});
