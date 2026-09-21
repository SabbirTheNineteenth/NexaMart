import "dotenv/config";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { assertLocalDemoCatalogSeedExecutionGuard } from "../db/seeds/runLocalDemoSeed.js";
import { runLocalCustomerQaFixtureSeed, verifyLocalCustomerQaFixture } from "../db/seeds/runLocalCustomerQaFixture.js";

assertLocalDemoCatalogSeedExecutionGuard(process.env);

const password = randomBytes(32).toString("base64url");
const passwordHash = await hash(password, 12);
const { localCustomerQaFixtureRepository } = await import("./local-customer-qa-fixture.helpers.js");
await runLocalCustomerQaFixtureSeed(localCustomerQaFixtureRepository, process.env, passwordHash);

const { createApp } = await import("../app.js");
await verifyLocalCustomerQaFixture(createApp(process.env), password, (line) => console.log(line));
