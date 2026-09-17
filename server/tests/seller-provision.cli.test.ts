import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { runSellerProvisioning } from "../src/scripts/seller-provision.cli.js";

test("seller provisioning CLI collects every seller field, keeps password output hidden, and reports only the outcome", async () => {
  const answers = [
    "seller@example.com",
    "Seller Name",
    "Seller Store",
    "seller-store",
    "A valid seller profile description.",
  ];
  const password = randomBytes(24).toString("base64url");
  const prompts: string[] = [];
  const output: string[] = [];
  let received: Record<string, unknown> | undefined;

  await runSellerProvisioning({
    async question(question) { prompts.push(question); return answers.shift()!; },
    async hidden(question) { prompts.push(question); return password; },
    async provision(input) { received = input; return { id: "seller-1", created: true }; },
    write(message) { output.push(message); },
  });

  assert.deepEqual(prompts, ["Seller email: ", "Seller name: ", "Store name: ", "Store slug: ", "Store description (optional): ", "Seller password: "]);
  assert.deepEqual(received, {
    email: "seller@example.com", name: "Seller Name", storeName: "Seller Store", storeSlug: "seller-store",
    description: "A valid seller profile description.", password,
  });
  assert.deepEqual(output, ["Seller created.\n"]);
  assert.equal(output.join("").includes(password), false);
});
