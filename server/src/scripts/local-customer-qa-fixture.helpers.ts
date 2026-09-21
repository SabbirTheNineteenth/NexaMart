import { db } from "../db/client.js";
import { accounts } from "../db/schema/index.js";
import type { LocalCustomerQaFixtureRepository } from "../db/seeds/runLocalCustomerQaFixture.js";

export const localCustomerQaFixtureRepository: LocalCustomerQaFixtureRepository = {
  async upsertCustomer(input) {
    await db.insert(accounts).values(input).onConflictDoUpdate({
      target: accounts.email,
      set: { name: input.name, passwordHash: input.passwordHash, role: "customer", updatedAt: new Date() },
    });
  },
};
