import type { AdminProduct } from "@/types/admin";

export function replacePublishedProduct(products: AdminProduct[], product: AdminProduct): AdminProduct[] {
  return products.map((current) => current.id === product.id ? product : current);
}

export function productPublicationError(reason: unknown): string {
  if (reason instanceof DOMException && reason.name === "AbortError") return "";
  if (typeof reason === "object" && reason !== null && "status" in reason && reason.status === 409) return "Product changed; reload and review again.";
  if (typeof reason === "object" && reason !== null && "status" in reason && reason.status === 404) return "Product was not found or is no longer available.";
  return reason instanceof Error ? reason.message : "Unable to update product publication.";
}
