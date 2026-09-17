type TrackingEvent = {
  id: string;
  orderItemId?: string | null;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
};

const titleForEvent = (eventType: string) => {
  const title = eventType.replaceAll("_", " ");
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`;
};

export const customerOrderItemSummary = (items: { productId: string; quantity: number; unitPrice: number }[]) => {
  const count = items.reduce((total, item) => total + item.quantity, 0);
  return `${count} item${count === 1 ? "" : "s"}`;
};

export const customerTrackingTimelineEvents = (events: TrackingEvent[]) => events.map((event) => ({
  id: event.id,
  title: titleForEvent(event.eventType),
  detail: event.note ?? (event.fromStatus && event.toStatus ? `${event.fromStatus.charAt(0).toUpperCase()}${event.fromStatus.slice(1)} → ${event.toStatus}` : "Fulfillment update recorded"),
  createdAt: event.createdAt,
}));

export const customerTrackingEmptyMessage = () => "No fulfillment updates yet.";

export const customerTrackingErrorMessage = (reason: unknown) => reason instanceof Error && reason.name !== "AbortError" ? reason.message : "Unable to load fulfillment updates";
