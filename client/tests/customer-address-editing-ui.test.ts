import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAddressUpdate, validateAddressUpdate } from "../src/features/account/address-editing";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("address edits trim required fields and send null for blank optional fields to clear them", () => {
  const update = buildAddressUpdate({
    recipientName: "  Samira Rahman  ",
    phone: " 01700 000000 ",
    line1: "  12 Lake Road ",
    line2: " Apartment 4B ",
    city: " Dhaka ",
    region: " Dhaka Division ",
    postalCode: " 1205 ",
    country: " bd ",
  });

  assert.deepEqual(update, {
    recipientName: "Samira Rahman",
    phone: "01700 000000",
    line1: "12 Lake Road",
    line2: "Apartment 4B",
    city: "Dhaka",
    region: "Dhaka Division",
    postalCode: "1205",
    country: "BD",
  });

  assert.deepEqual(buildAddressUpdate({
    recipientName: " Samira Rahman ", phone: " 01700 000000 ", line1: " 12 Lake Road ", line2: " \t ", city: " Dhaka ", region: " ", postalCode: "\n", country: " bd ",
  }), { recipientName: "Samira Rahman", phone: "01700 000000", line1: "12 Lake Road", line2: null, city: "Dhaka", region: null, postalCode: null, country: "BD" });
});

test("address edit validation reports required and country-code errors before saving", () => {
  assert.match(validateAddressUpdate({ recipientName: "", phone: "01700", line1: "12 Lake Road", line2: "", city: "Dhaka", region: "", postalCode: "", country: "BD" }) ?? "", /recipient/i);
  assert.match(validateAddressUpdate({ recipientName: "Samira", phone: "", line1: "12 Lake Road", line2: "", city: "Dhaka", region: "", postalCode: "", country: "BD" }) ?? "", /phone/i);
  assert.match(validateAddressUpdate({ recipientName: "Samira", phone: "01700", line1: "", line2: "", city: "Dhaka", region: "", postalCode: "", country: "BD" }) ?? "", /address/i);
  assert.match(validateAddressUpdate({ recipientName: "Samira", phone: "01700", line1: "12 Lake Road", line2: "", city: "", region: "", postalCode: "", country: "BD" }) ?? "", /city/i);
  assert.match(validateAddressUpdate({ recipientName: "Samira", phone: "01700", line1: "12 Lake Road", line2: "", city: "Dhaka", region: "", postalCode: "", country: "Bangladesh" }) ?? "", /country/i);
});

test("each saved address provides an accessible form that PATCHes one address and replaces only its returned local value", () => {
  assert.match(workspace, /import \{ deleteJSON, getJSON, postJSON \} from "@\/lib\/api";/);
  assert.match(workspace, /import \{ ApiError, patchJSON \} from "@\/lib\/api";/);
  assert.match(workspace, /addressEditors\[address\.id\] && <form id=\{`address-editor-\$\{address\.id\}`\} className=\{styles\.addressEditorForm\} onSubmit=\{\(event\) => void editAddress\(event, address\)\} aria-label=\{`Edit shipping address for \$\{address\.recipientName\}`\}/);
  assert.match(workspace, /name="recipientName"/);
  assert.match(workspace, /name="phone"/);
  assert.match(workspace, /name="line1"/);
  assert.match(workspace, /name="line2"/);
  assert.match(workspace, /name="city"/);
  assert.match(workspace, /name="region"/);
  assert.match(workspace, /name="postalCode"/);
  assert.match(workspace, /name="country"/);
  assert.match(workspace, /patchJSON<\{ address: ShippingAddress \}>\(`\/addresses\/\$\{address\.id\}`, update\)/);
  assert.match(workspace, /setAddressesState\(\(current\) => current\.state === "loaded" \? \{ state: "loaded", items: current\.items\.map\(\(saved\) => saved\.id === updatedAddress\.id \? updatedAddress : saved\)/);
  assert.match(workspace, /Address was not found or is no longer available\./);
  assert.match(workspace, /role="status"/);
  assert.match(workspace, /role="alert"/);
  assert.match(styles, /\.account-address-editor/);
});
