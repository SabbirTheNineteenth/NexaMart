import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const now = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const accountRole = pgEnum("account_role", ["customer", "seller", "admin"]);
export const orderStatus = pgEnum("order_status", ["pending", "confirmed", "cancelled"]);
export const paymentStatus = pgEnum("payment_status", ["unpaid", "collected"]);
export const fulfillmentStatus = pgEnum("fulfillment_status", ["pending", "processing", "packed", "shipped", "delivered", "cancelled", "returned", "failed_delivery", "return_requested"]);
export const sellerProfileStatus = pgEnum("seller_profile_status", ["pending", "approved", "rejected", "suspended", "active"]);
export const commissionStatus = pgEnum("commission_status", ["accrued", "eligible", "paid", "void"]);
export const payoutStatus = pgEnum("payout_status", ["pending", "approved", "paid", "rejected"]);
export const promotionScope = pgEnum("promotion_scope", ["product", "order"]);
export const taxonomyKind = pgEnum("taxonomy_kind", ["category", "subcategory", "brand"]);
export const taxonomyProposalStatus = pgEnum("taxonomy_proposal_status", ["pending", "approved", "rejected", "withdrawn"]);
export const productModerationStatus = pgEnum("product_moderation_status", ["draft", "pending_review", "approved", "rejected", "changes_requested"]);
export const sellerNotificationType = pgEnum("seller_notification_type", ["product_moderation_decision", "order_line_created"]);

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: accountRole("role").notNull().default("customer"),
  createdAt: now(),
  updatedAt: updatedAt(),
});

export const customerTelegramLinkChallenges = pgTable("customer_telegram_link_challenges", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: now(),
});

export const customerTelegramLinks = pgTable("customer_telegram_links", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  chatId: varchar("chat_id", { length: 32 }).notNull().unique(),
  codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
  createdAt: now(),
});

export const serviceActors = pgTable("service_actors", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  createdAt: now(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: now(),
});

export const sellerProfiles = pgTable("seller_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().unique().references(() => accounts.id, { onDelete: "restrict" }),
  storeName: varchar("store_name", { length: 120 }).notNull(),
  storeSlug: varchar("store_slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  status: sellerProfileStatus("status").notNull().default("pending"),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("seller_profiles_store_name_unique").on(sql`lower(${table.storeName})`),
  uniqueIndex("seller_profiles_status_created_at_index").on(table.status, table.createdAt),
]);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: now(),
  updatedAt: updatedAt(),
});

export const subcategories = pgTable("subcategories", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("subcategories_category_slug_unique").on(table.categoryId, table.slug), index("subcategories_category_active_index").on(table.categoryId, table.isActive)]);

export const brands = pgTable("brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: now(),
  updatedAt: updatedAt(),
});

export const taxonomyProposals = pgTable("taxonomy_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  kind: taxonomyKind("kind").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }),
  status: taxonomyProposalStatus("status").notNull().default("pending"),
  canonicalId: uuid("canonical_id"),
  reviewNote: text("review_note"),
  reviewedById: uuid("reviewed_by_id").references(() => accounts.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [index("taxonomy_proposals_seller_status_created_index").on(table.sellerId, table.status, table.createdAt), index("taxonomy_proposals_status_created_index").on(table.status, table.createdAt)]);

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").references(() => accounts.id, { onDelete: "restrict" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  subcategoryId: uuid("subcategory_id").references(() => subcategories.id, { onDelete: "set null" }),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  name: varchar("name", { length: 180 }).notNull(),
  brand: varchar("brand", { length: 120 }),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  description: text("description").notNull(),
  primaryImageUrl: text("primary_image_url").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 12, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  colors: jsonb("colors").$type<string[]>().notNull().default([]),
  isPublished: boolean("is_published").notNull().default(false),
  moderationStatus: productModerationStatus("moderation_status").notNull().default("draft"),
  moderationReason: text("moderation_reason"),
  moderatedById: uuid("moderated_by_id").references(() => accounts.id, { onDelete: "set null" }),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  moderationRevision: integer("moderation_revision").notNull().default(0),
  createdAt: now(),
  updatedAt: updatedAt(),
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 120 }).notNull(),
  options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("product_variants_product_sku_unique").on(table.productId, table.sku)]);

export const productGalleryImages = pgTable("product_gallery_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  altText: varchar("alt_text", { length: 240 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: now(),
}, (table) => [uniqueIndex("product_gallery_images_product_sort_order_unique").on(table.productId, table.sortOrder)]);

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  recipientName: varchar("recipient_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  line1: varchar("line1", { length: 180 }).notNull(),
  line2: varchar("line2", { length: 180 }),
  city: varchar("city", { length: 120 }).notNull(),
  region: varchar("region", { length: 120 }),
  postalCode: varchar("postal_code", { length: 24 }),
  country: varchar("country", { length: 2 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("addresses_account_default_unique").on(table.accountId).where(sql`${table.isDefault} = true`)]);

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("cart_items_account_product_variant_unique").on(table.accountId, table.productId, table.variantId), index("cart_items_variant_id_index").on(table.variantId)]);

export const wishlistItems = pgTable("wishlist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: now(),
}, (table) => [uniqueIndex("wishlist_items_account_product_unique").on(table.accountId, table.productId)]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  customerId: uuid("customer_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  status: orderStatus("status").notNull().default("pending"),
  paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
  paymentMethod: varchar("payment_method", { length: 16 }).notNull().default("cod"),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  shippingAddressSnapshot: jsonb("shipping_address_snapshot").$type<{ recipientName: string; phone: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; country: string }>().notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("orders_customer_idempotency_key_unique").on(table.customerId, table.idempotencyKey), check("orders_cod_payment_method_check", sql`${table.paymentMethod} = 'cod'`)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  variantSku: varchar("variant_sku", { length: 120 }),
  variantOptions: jsonb("variant_options").$type<Record<string, string>>(),
  sellerId: uuid("seller_id").references(() => accounts.id, { onDelete: "restrict" }),
  sellerName: varchar("seller_name", { length: 120 }),
  productName: varchar("product_name", { length: 180 }).notNull(),
  productImageUrl: text("product_image_url"),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  baseUnitPrice: numeric("base_unit_price", { precision: 12, scale: 2 }),
  promotionId: uuid("promotion_id").references(() => promotions.id, { onDelete: "set null" }),
  promotionName: varchar("promotion_name", { length: 120 }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  fulfillmentStatus: fulfillmentStatus("fulfillment_status").notNull().default("pending"),
  codCollectedAt: timestamp("cod_collected_at", { withTimezone: true }),
}, (table) => [index("order_items_variant_id_index").on(table.variantId)]);

export const commissionRecords = pgTable("commission_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderItemId: uuid("order_item_id").notNull().unique().references(() => orderItems.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
  ratePercent: numeric("rate_percent", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull(),
  status: commissionStatus("status").notNull().default("accrued"),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("commission_records_seller_status_created_index").on(table.sellerId, table.status, table.createdAt)]);

export const payoutRecords = pgTable("payout_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: payoutStatus("status").notNull().default("pending"),
  requestedById: uuid("requested_by_id").references(() => accounts.id, { onDelete: "set null" }),
  reviewedById: uuid("reviewed_by_id").references(() => accounts.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("payout_records_seller_status_created_index").on(table.sellerId, table.status, table.createdAt)]);

export const promotions = pgTable("promotions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 120 }).notNull(),
  scope: promotionScope("scope").notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("promotions_seller_starts_at_index").on(table.sellerId, table.startsAt)]);

export const productReviews = pgTable("product_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 120 }),
  body: text("body"),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("product_reviews_customer_order_item_unique").on(table.customerId, table.orderItemId), uniqueIndex("product_reviews_product_visible_created_index").on(table.productId, table.isVisible, table.createdAt)]);

export const orderEvents = pgTable("order_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => accounts.id, { onDelete: "set null" }),
  serviceActorId: uuid("service_actor_id").references(() => serviceActors.id, { onDelete: "restrict" }),
  source: varchar("source", { length: 16 }).notNull().default("account"),
  externalEventId: varchar("external_event_id", { length: 128 }),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  fromStatus: varchar("from_status", { length: 32 }),
  toStatus: varchar("to_status", { length: 32 }),
  note: text("note"),
  createdAt: now(),
}, (table) => [index("order_events_order_created_at_index").on(table.orderId, table.createdAt), uniqueIndex("order_events_order_sequence_unique").on(table.orderId, table.sequence), uniqueIndex("order_events_external_event_id_unique").on(table.externalEventId).where(sql`${table.externalEventId} is not null`), check("order_events_n8n_service_actor_check", sql`${table.source} <> 'n8n' OR (${table.actorId} IS NULL AND ${table.serviceActorId} IS NOT NULL)`)]);

export const codOutbox = pgTable("cod_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  lastError: text("last_error"),
  deliveryOutcome: varchar("delivery_outcome", { length: 32 }),
  createdAt: now(),
}, (table) => [index("cod_outbox_pending_index").on(table.deliveredAt, table.nextAttemptAt)]);

export const sellerNotifications = pgTable("seller_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  type: sellerNotificationType("type").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: now(),
}, (table) => [index("seller_notifications_seller_created_at_index").on(table.sellerId, table.createdAt), index("seller_notifications_seller_unread_created_at_index").on(table.sellerId, table.readAt, table.createdAt)]);

export const auditRecords = pgTable("audit_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 80 }).notNull(),
  resourceId: uuid("resource_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: now(),
}, (table) => [index("audit_records_created_at_index").on(table.createdAt)]);

export const serviceAuditRecords = pgTable("service_audit_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceActorId: uuid("service_actor_id").notNull().references(() => serviceActors.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 80 }).notNull(),
  resourceId: uuid("resource_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: now(),
}, (table) => [index("service_audit_records_created_at_index").on(table.createdAt)]);

export const accountRelations = relations(accounts, ({ one, many }) => ({ sellerProfile: one(sellerProfiles), products: many(products), promotions: many(promotions), addresses: many(addresses), cartItems: many(cartItems), orders: many(orders), commissions: many(commissionRecords), payouts: many(payoutRecords), sellerNotifications: many(sellerNotifications) }));
export const addressRelations = relations(addresses, ({ one }) => ({ account: one(accounts, { fields: [addresses.accountId], references: [accounts.id] }) }));
export const sellerProfileRelations = relations(sellerProfiles, ({ one }) => ({ account: one(accounts, { fields: [sellerProfiles.accountId], references: [accounts.id] }) }));
export const categoryRelations = relations(categories, ({ many }) => ({ subcategories: many(subcategories), products: many(products) }));
export const subcategoryRelations = relations(subcategories, ({ one, many }) => ({ category: one(categories, { fields: [subcategories.categoryId], references: [categories.id] }), products: many(products) }));
export const brandRelations = relations(brands, ({ many }) => ({ products: many(products) }));
export const productRelations = relations(products, ({ one, many }) => ({ seller: one(accounts, { fields: [products.sellerId], references: [accounts.id] }), category: one(categories, { fields: [products.categoryId], references: [categories.id] }), subcategory: one(subcategories, { fields: [products.subcategoryId], references: [subcategories.id] }), brandNode: one(brands, { fields: [products.brandId], references: [brands.id] }), variants: many(productVariants), galleryImages: many(productGalleryImages), cartItems: many(cartItems), orderItems: many(orderItems), promotions: many(promotions), reviews: many(productReviews) }));
export const productVariantRelations = relations(productVariants, ({ one, many }) => ({ product: one(products, { fields: [productVariants.productId], references: [products.id] }), cartItems: many(cartItems), orderItems: many(orderItems) }));
export const productGalleryImageRelations = relations(productGalleryImages, ({ one }) => ({ product: one(products, { fields: [productGalleryImages.productId], references: [products.id] }) }));
export const promotionRelations = relations(promotions, ({ one }) => ({ seller: one(accounts, { fields: [promotions.sellerId], references: [accounts.id] }), product: one(products, { fields: [promotions.productId], references: [products.id] }) }));
export const sellerNotificationRelations = relations(sellerNotifications, ({ one }) => ({ seller: one(accounts, { fields: [sellerNotifications.sellerId], references: [accounts.id] }), product: one(products, { fields: [sellerNotifications.productId], references: [products.id] }), order: one(orders, { fields: [sellerNotifications.orderId], references: [orders.id] }), orderItem: one(orderItems, { fields: [sellerNotifications.orderItemId], references: [orderItems.id] }) }));
export const orderRelations = relations(orders, ({ one, many }) => ({ customer: one(accounts, { fields: [orders.customerId], references: [accounts.id] }), items: many(orderItems), events: many(orderEvents) }));
export const cartItemRelations = relations(cartItems, ({ one }) => ({ account: one(accounts, { fields: [cartItems.accountId], references: [accounts.id] }), product: one(products, { fields: [cartItems.productId], references: [products.id] }), variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }) }));
export const orderItemRelations = relations(orderItems, ({ one, many }) => ({ order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }), product: one(products, { fields: [orderItems.productId], references: [products.id] }), variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }), seller: one(accounts, { fields: [orderItems.sellerId], references: [accounts.id] }), events: many(orderEvents), reviews: many(productReviews), commission: one(commissionRecords) }));
export const commissionRecordRelations = relations(commissionRecords, ({ one }) => ({ orderItem: one(orderItems, { fields: [commissionRecords.orderItemId], references: [orderItems.id] }), seller: one(accounts, { fields: [commissionRecords.sellerId], references: [accounts.id] }) }));
export const payoutRecordRelations = relations(payoutRecords, ({ one }) => ({ seller: one(accounts, { fields: [payoutRecords.sellerId], references: [accounts.id] }), requestedBy: one(accounts, { fields: [payoutRecords.requestedById], references: [accounts.id], relationName: "payout_requested_by" }), reviewedBy: one(accounts, { fields: [payoutRecords.reviewedById], references: [accounts.id], relationName: "payout_reviewed_by" }) }));
export const productReviewRelations = relations(productReviews, ({ one }) => ({ product: one(products, { fields: [productReviews.productId], references: [products.id] }), orderItem: one(orderItems, { fields: [productReviews.orderItemId], references: [orderItems.id] }), customer: one(accounts, { fields: [productReviews.customerId], references: [accounts.id] }) }));
export const orderEventRelations = relations(orderEvents, ({ one }) => ({ order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }), orderItem: one(orderItems, { fields: [orderEvents.orderItemId], references: [orderItems.id] }), actor: one(accounts, { fields: [orderEvents.actorId], references: [accounts.id] }) }));
