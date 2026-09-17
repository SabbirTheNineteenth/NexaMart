import "dotenv/config";
import { DEMO_CATALOG } from "./demo-catalog.js";
import { seedDemoCatalog, validateDemoSeedEnvironment } from "./demo-seed.helpers.js";

const storeSlug = validateDemoSeedEnvironment(process.env);
const { demoSeedRepository } = await import("./demo-seed.repository.js");
const result = await seedDemoCatalog(demoSeedRepository, storeSlug, DEMO_CATALOG);
console.log(`Demo catalog seed complete for ${storeSlug}: ${result.categoryCount} categories, ${result.productCount} products.`);
