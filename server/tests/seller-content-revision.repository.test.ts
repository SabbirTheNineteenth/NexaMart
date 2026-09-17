import assert from "node:assert/strict";
import test from "node:test";
import { PostgresSellerCatalogRepository } from "../src/modules/seller/postgres-seller-catalog.repository.js";

test("creating a variant for an owned published product atomically returns it to draft", async () => {
  const writes: unknown[] = [];
  const transaction = {
    update() {
      const query = {
        set(values: unknown) { writes.push(values); return query; },
        where() { return query; },
        returning() { return Promise.resolve([{ id: "product-1" }]); },
      };
      return query;
    },
    insert() {
      const query = {
        values(values: unknown) { writes.push(values); return query; },
        returning() { return Promise.resolve([{ id: "variant-1", sku: "LAMP-WHT", options: { color: "White" }, price: "89.00", stock: 5 }]); },
      };
      return query;
    },
  };
  const database = {
    select() { const query = { from() { return query; }, where() { return query; }, limit() { return Promise.resolve([{ id: "product-1" }]); } }; return query; },
    async transaction(work: (tx: typeof transaction) => Promise<unknown>) { return work(transaction); },
  };
  const repository = new PostgresSellerCatalogRepository(database as never);

  const variant = await repository.createVariant({ sellerId: "seller-1", productId: "product-1", sku: "LAMP-WHT", options: { color: "White" }, price: 89, stock: 5 });

  assert.deepEqual(variant, { id: "variant-1", sku: "LAMP-WHT", options: { color: "White" }, price: "89.00", stock: 5 });
  assert.equal((writes[0] as { isPublished?: boolean }).isPublished, false);
  assert.deepEqual(writes[1], { productId: "product-1", sku: "LAMP-WHT", options: { color: "White" }, price: "89.00", stock: 5 });
});

test("updating variant content for an owned published product atomically returns it to draft", async () => {
  const writes: unknown[] = [];
  const transaction = {
    update() {
      const query = {
        set(values: unknown) { writes.push(values); return query; },
        where() { return query; },
        returning() { return Promise.resolve(writes.length === 1 ? [{ id: "variant-1", sku: "LAMP-BLK", options: { color: "Black" }, price: "99.50", stock: 5 }] : [{ id: "product-1" }]); },
      };
      return query;
    },
  };
  const database = {
    select() { const query = { from() { return query; }, where() { return query; } }; return query; },
    async transaction(work: (tx: typeof transaction) => Promise<unknown>) { return work(transaction); },
  };
  const repository = new PostgresSellerCatalogRepository(database as never);

  const variant = await repository.updateVariant({ sellerId: "seller-1", productId: "product-1", variantId: "variant-1", sku: "LAMP-BLK", options: { color: "Black" }, price: 99.5 });

  assert.deepEqual(variant, { id: "variant-1", sku: "LAMP-BLK", options: { color: "Black" }, price: "99.50", stock: 5 });
  assert.equal((writes[1] as { isPublished?: boolean }).isPublished, false);
});

test("creating a gallery image for an owned published product atomically returns it to draft", async () => {
  const writes: unknown[] = [];
  const transaction = {
    update() { const query = { set(values: unknown) { writes.push(values); return query; }, where() { return query; }, returning() { return Promise.resolve([{ id: "product-1" }]); } }; return query; },
    insert() { const query = { values(values: unknown) { writes.push(values); return query; }, returning() { return Promise.resolve([{ id: "image-1", imageUrl: "https://cdn.example/lamp.jpg", altText: "Studio lamp", sortOrder: 0 }]); } }; return query; },
  };
  const database = { async transaction(work: (tx: typeof transaction) => Promise<unknown>) { return work(transaction); } };
  const repository = new PostgresSellerCatalogRepository(database as never);

  const image = await repository.createGalleryImage({ sellerId: "seller-1", productId: "product-1", imageUrl: "https://cdn.example/lamp.jpg", altText: "Studio lamp", sortOrder: 0 });

  assert.deepEqual(image, { id: "image-1", imageUrl: "https://cdn.example/lamp.jpg", altText: "Studio lamp", sortOrder: 0 });
  assert.equal((writes[0] as { isPublished?: boolean }).isPublished, false);
  assert.deepEqual(writes[1], { productId: "product-1", imageUrl: "https://cdn.example/lamp.jpg", altText: "Studio lamp", sortOrder: 0 });
});

test("updating gallery content for an owned published product atomically returns it to draft", async () => {
  const writes: unknown[] = [];
  const transaction = {
    update() { const query = { set(values: unknown) { writes.push(values); return query; }, where() { return query; }, returning() { return Promise.resolve(writes.length === 1 ? [{ id: "image-1", imageUrl: "https://cdn.example/black-lamp.jpg", altText: "Black lamp", sortOrder: 2 }] : [{ id: "product-1" }]); } }; return query; },
  };
  const database = {
    select() { const query = { from() { return query; }, where() { return query; } }; return query; },
    async transaction(work: (tx: typeof transaction) => Promise<unknown>) { return work(transaction); },
  };
  const repository = new PostgresSellerCatalogRepository(database as never);

  const image = await repository.updateGalleryImage({ sellerId: "seller-1", productId: "product-1", imageId: "image-1", imageUrl: "https://cdn.example/black-lamp.jpg", altText: "Black lamp", sortOrder: 2 });

  assert.deepEqual(image, { id: "image-1", imageUrl: "https://cdn.example/black-lamp.jpg", altText: "Black lamp", sortOrder: 2 });
  assert.equal((writes[1] as { isPublished?: boolean }).isPublished, false);
});

test("an unowned product is concealed and has no revision write", async () => {
  let inserted = false;
  const transaction = {
    update() { const query = { set() { return query; }, where() { return query; }, returning() { return Promise.resolve([]); } }; return query; },
    insert() { inserted = true; throw new Error("must not insert"); },
  };
  const database = { async transaction(work: (tx: typeof transaction) => Promise<unknown>) { return work(transaction); } };
  const repository = new PostgresSellerCatalogRepository(database as never);

  assert.equal(await repository.createVariant({ sellerId: "seller-1", productId: "other-seller-product", sku: "OTHER", options: {}, price: 1, stock: 0 }), null);
  assert.equal(inserted, false);
});

test("a failed asset update rolls back without drafting its parent", async () => {
  let committed = false;
  let parentDrafted = false;
  const transaction = {
    update() {
      const query = {
        set(values: { isPublished?: boolean }) { if (values.isPublished === false) parentDrafted = true; return query; },
        where() { return query; },
        returning() { return Promise.resolve([]); },
      };
      return query;
    },
  };
  const database = {
    select() { const query = { from() { return query; }, where() { return query; } }; return query; },
    async transaction(work: (tx: typeof transaction) => Promise<unknown>) { try { const result = await work(transaction); committed = true; return result; } catch (error) { return Promise.reject(error); } },
  };
  const repository = new PostgresSellerCatalogRepository(database as never);

  assert.equal(await repository.updateGalleryImage({ sellerId: "seller-1", productId: "product-1", imageId: "missing-image", sortOrder: 2 }), null);
  assert.equal(committed, false);
  assert.equal(parentDrafted, false);
});

test("variant stock-only updates preserve publication status", async () => {
  let transactionStarted = false;
  let persisted: { stock?: number; isPublished?: boolean } | undefined;
  const database = {
    update() { const query = { set(values: { stock?: number; isPublished?: boolean }) { persisted = values; return query; }, where() { return query; }, returning() { return Promise.resolve([{ id: "variant-1", sku: "LAMP-WHT", options: { color: "White" }, price: "89.00", stock: 12 }]); } }; return query; },
    select() { const query = { from() { return query; }, where() { return query; } }; return query; },
    async transaction() { transactionStarted = true; throw new Error("content transaction must not start"); },
  };
  const repository = new PostgresSellerCatalogRepository(database as never);

  assert.deepEqual(await repository.updateVariant({ sellerId: "seller-1", productId: "product-1", variantId: "variant-1", stock: 12 }), { id: "variant-1", sku: "LAMP-WHT", options: { color: "White" }, price: "89.00", stock: 12 });
  assert.equal(transactionStarted, false);
  assert.equal(persisted?.isPublished, undefined);
});

test("stock-only updates preserve publication status", async () => {
  let persisted: { stock?: number; isPublished?: boolean } | undefined;
  const database = {
    update() { const query = { set(values: { stock?: number; isPublished?: boolean }) { persisted = values; return query; }, where() { return query; }, returning() { return Promise.resolve([{ id: "product-1" }]); } }; return query; },
  };
  const repository = new PostgresSellerCatalogRepository(database as never);

  assert.equal(await repository.updateStock({ sellerId: "seller-1", productId: "product-1", stock: 12 }), true);
  assert.equal(persisted?.stock, 12);
  assert.equal(persisted?.isPublished, undefined);
});

test("deleting owned content atomically returns its parent to an unpublished draft", async () => {
  const writes: unknown[] = [];
  const transaction = {
    delete() { const query = { where() { return query; }, returning() { return Promise.resolve([{ id: "asset-1" }]); } }; return query; },
    update() { const query = { set(values: unknown) { writes.push(values); return query; }, where() { return query; }, returning() { return Promise.resolve([{ id: "product-1" }]); } }; return query; },
  };
  const database = { select() { const query = { from() { return query; }, where() { return query; } }; return query; }, async transaction(work: (tx: typeof transaction) => Promise<unknown>) { return work(transaction); } };
  const repository = new PostgresSellerCatalogRepository(database as never);

  assert.equal(await repository.deleteVariant({ sellerId: "seller-1", productId: "product-1", variantId: "variant-1" }), true);
  assert.equal(await repository.deleteGalleryImage({ sellerId: "seller-1", productId: "product-1", imageId: "image-1" }), true);
  for (const write of writes as { isPublished?: boolean; moderationStatus?: string; moderationReason?: unknown }[]) {
    assert.equal(write.isPublished, false);
    assert.equal(write.moderationStatus, "draft");
    assert.equal(write.moderationReason, null);
  }
});

test("archiving an owned product preserves its row while making it unavailable", async () => {
  let persisted: Record<string, unknown> | undefined;
  const database = { update() { const query = { set(values: Record<string, unknown>) { persisted = values; return query; }, where() { return query; }, returning() { return Promise.resolve([{ id: "product-1" }]); } }; return query; } };
  const repository = new PostgresSellerCatalogRepository(database as never);

  assert.equal(await repository.archiveProduct({ sellerId: "seller-1", productId: "product-1" }), true);
  assert.equal(persisted?.isPublished, false);
  assert.equal(persisted?.moderationStatus, "draft");
  assert.equal(persisted?.moderationReason, null);
});
