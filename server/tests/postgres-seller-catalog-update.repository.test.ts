import assert from "node:assert/strict";
import test from "node:test";
import { PostgresSellerCatalogRepository } from "../src/modules/seller/postgres-seller-catalog.repository.js";

test("seller catalog repository atomically updates only the owned product's editable details", async () => {
  let persisted: unknown;
  let whereCalled = false;
  const database = {
    update() {
      const query = {
        set(values: unknown) { persisted = values; return query; },
        where() { whereCalled = true; return query; },
        returning() {
          return Promise.resolve([{ id: "product-1", name: "Updated Studio Lamp", brand: null, slug: "studio-lamp", description: "A warm adjustable lamp with dimmable light.", price: "99.50", categoryId: "11111111-1111-4111-8111-111111111111", primaryImageUrl: "https://cdn.example/updated-lamp.jpg", colors: ["White", "Black"] }]);
        },
      };
      return query;
    },
  };
  const repository = new PostgresSellerCatalogRepository(database as never);

  const product = await repository.updateProduct({
    sellerId: "seller-1", productId: "product-1", name: "Updated Studio Lamp", description: "A warm adjustable lamp with dimmable light.", price: 99.5,
    categoryId: "11111111-1111-4111-8111-111111111111", primaryImageUrl: "https://cdn.example/updated-lamp.jpg", colors: ["White", "Black"],
  });

  assert.equal(whereCalled, true);
  assert.deepEqual(persisted, {
    name: "Updated Studio Lamp", description: "A warm adjustable lamp with dimmable light.", price: "99.50",
    categoryId: "11111111-1111-4111-8111-111111111111", primaryImageUrl: "https://cdn.example/updated-lamp.jpg", colors: ["White", "Black"], isPublished: false, moderationStatus: "draft", moderationReason: null, updatedAt: persisted && (persisted as { updatedAt: unknown }).updatedAt,
  });
  assert.deepEqual(product, { id: "product-1", name: "Updated Studio Lamp", slug: "studio-lamp", description: "A warm adjustable lamp with dimmable light.", price: 99.5, categoryId: "11111111-1111-4111-8111-111111111111", primaryImageUrl: "https://cdn.example/updated-lamp.jpg", colors: ["White", "Black"] });
});

test("seller catalog repository returns null when no product belongs to the session seller", async () => {
  const database = {
    update() {
      const query = { set() { return query; }, where() { return query; }, returning() { return Promise.resolve([]); } };
      return query;
    },
  };

  assert.equal(await new PostgresSellerCatalogRepository(database as never).updateProduct({ sellerId: "seller-1", productId: "other-seller-product", name: "Updated Studio Lamp" }), null);
});
