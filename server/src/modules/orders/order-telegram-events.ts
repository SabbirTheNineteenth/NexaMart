type SharedEvent = {
  eventId: string;
  occurredAt: string;
  orderId: string;
  reference: string;
  paymentMethod: "cod";
  paymentStatus: "unpaid" | "collected";
};

export function buildOrderCreatedEvent(input: SharedEvent & {
  total: string;
  status: "pending";
  items: readonly { productName: string; quantity: number }[];
} & Record<string, unknown>) {
  return {
    eventId: input.eventId,
    eventType: "order.created" as const,
    occurredAt: input.occurredAt,
    orderId: input.orderId,
    reference: input.reference,
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentStatus,
    orderStatus: input.status,
    fulfillmentStatus: "pending" as const,
    total: input.total,
    currency: "BDT" as const,
    items: input.items.map(({ productName, quantity }) => ({ name: productName, quantity })),
  };
}

export function buildOrderStatusUpdatedEvent(input: SharedEvent & {
  orderItemId: string;
  itemName: string;
  fulfillmentStatus: string;
  note?: string;
} & Record<string, unknown>) {
  return {
    eventId: input.eventId,
    eventType: "order.status_updated" as const,
    occurredAt: input.occurredAt,
    orderId: input.orderId,
    orderItemId: input.orderItemId,
    reference: input.reference,
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentStatus,
    fulfillmentStatus: input.fulfillmentStatus,
    itemName: input.itemName,
    ...(input.note ? { note: input.note } : {}),
  };
}
