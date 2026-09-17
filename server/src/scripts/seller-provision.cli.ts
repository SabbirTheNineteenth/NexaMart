import type { SellerProvisioningInput } from "./seller-provision.helpers.js";

type SellerProvisioningCliDependencies = {
  question(question: string): Promise<string>;
  hidden(question: string): Promise<string>;
  provision(input: SellerProvisioningInput): Promise<{ id: string; created: boolean }>;
  write(message: string): void;
};

export async function runSellerProvisioning(dependencies: SellerProvisioningCliDependencies) {
  const email = await dependencies.question("Seller email: ");
  const name = await dependencies.question("Seller name: ");
  const storeName = await dependencies.question("Store name: ");
  const storeSlug = await dependencies.question("Store slug: ");
  const description = await dependencies.question("Store description (optional): ");
  const password = await dependencies.hidden("Seller password: ");
  const result = await dependencies.provision({ email, name, storeName, storeSlug, description, password });
  dependencies.write(`Seller ${result.created ? "created" : "updated"}.\n`);
}
