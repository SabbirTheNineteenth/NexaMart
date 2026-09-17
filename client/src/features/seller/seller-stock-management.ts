import type { SellerProduct } from "@/types/seller";

export function validateSellerStock(value: string): string | undefined {
  if (value.trim() === "") return "Enter a stock quantity.";
  if (!/^-?\d+$/.test(value.trim())) return "Stock must be a whole number.";
  const stock = Number(value);
  if (stock < 0) return "Stock must be zero or greater.";
  if (!Number.isSafeInteger(stock)) return "Stock must be a safe whole number.";
  return undefined;
}

export function replaceSellerProductStock(products: SellerProduct[], productId: string, stock: number): SellerProduct[] {
  return products.map((product) => product.id === productId ? { ...product, stock } : product);
}
