import "dotenv/config";
import { assertLocalDemoCatalogSeedExecutionGuard, runLocalDemoCatalogSeed } from "../db/seeds/runLocalDemoSeed.js";

assertLocalDemoCatalogSeedExecutionGuard(process.env);
const { localDemoCatalogSeedRepository } = await import("./local-demo-catalog-seed.helpers.js");
const result = await runLocalDemoCatalogSeed(localDemoCatalogSeedRepository, process.env);
console.log(`Local demo catalog seed complete: ${result.productCount} products, ${result.promotionCount} active deal.`);
