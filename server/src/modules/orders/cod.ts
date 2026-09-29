import { createHmac, timingSafeEqual } from "node:crypto";

export type CodStatus = "pending" | "processing" | "packed" | "shipped" | "delivered" | "failed_delivery" | "return_requested" | "returned" | "cancelled";
export type CodAction = Exclude<CodStatus, "pending">;
const allowed: Record<CodAction, readonly CodStatus[]> = {
  processing: ["pending"], packed: ["processing"], shipped: ["packed"], delivered: ["shipped"],
  failed_delivery: ["shipped"], return_requested: ["failed_delivery", "delivered"], returned: ["return_requested"],
  cancelled: ["pending", "processing"],
};
export const codTransitionAllowed = (from: CodStatus, to: CodAction) => allowed[to].includes(from);
export const canActOnCodLine = (kind: "seller" | "admin" | "n8n", actorId: string, sellerId: string | null) => kind !== "seller" || actorId === sellerId;
export const allCodLinesCollected = (lines: readonly { status: CodStatus; collectedAt: Date | null }[]) => lines.length > 0 && lines.every((line) => line.status === "delivered" && line.collectedAt !== null);

export type CodEventType = "cod.order.created" | "cod.order.confirmed" | "cod.order.dispatched" | "cod.order.delivered_collected" | "cod.order.delivery_failed" | "cod.order.returned";
export function createCodEventPayload(input: { eventId: string; eventType: CodEventType; occurredAt: string; orderId: string; reference: string; sellerId: string | null; amount: string; status: string; paymentStatus: string }) {
  return { eventId: input.eventId, eventType: input.eventType, occurredAt: input.occurredAt, orderId: input.orderId, reference: input.reference, sellerId: input.sellerId, amount: input.amount, currency: "BDT", orderStatus: input.status, paymentMethod: "cod" as const, paymentStatus: input.paymentStatus };
}
export function signCodWebhook(secret: string, timestamp: number, rawBody: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}
export function verifyCodWebhook(secret: string, timestamp: number, rawBody: string, signature: string, now: number = Math.floor(Date.now() / 1000)) {
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signCodWebhook(secret, timestamp, rawBody), "hex"), Buffer.from(signature, "hex"));
}
export function postCodWebhook(url: string, secret: string, payload: Record<string, unknown>, transport: typeof fetch = fetch, now: number = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(payload);
  return transport(url, { method: "POST", headers: { "content-type": "application/json", "x-nexamart-timestamp": String(now), "x-nexamart-signature": signCodWebhook(secret, now, raw) }, body: raw, signal: AbortSignal.timeout(5000) });
}
