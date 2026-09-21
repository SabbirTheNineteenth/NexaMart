# Final demo catalog plan

This development-only plan defines 100 deterministic display products in `server/src/db/seeds/demo-catalog-plan.ts`.

Each entry has only an identifier, name, brand, category, subcategory, and an Unsplash image source URL. The module is static data: it does not read configuration, connect to a database, run a seed, or change any schema.

The taxonomy covers Audio, Technology, Home, Outdoors, Style, Wellness, Kitchen, Stationery, Pets, and Travel. It is intended for local catalog presentation and test fixtures only. Product records intentionally do not describe ratings, discounts, fulfillment, payment, or inventory.
