import type { Product } from "@/types/catalog";

export type AvailabilityFacet = "all" | "in-stock" | "low-stock" | "out-of-stock";
export type ProductTypeFacet = "all" | "standard" | "variant-based";

export function referenceFacetProducts(products: Product[], availability: AvailabilityFacet, productType: ProductTypeFacet): Product[] {
  return products.filter((product) => {
    const variants = product.variants ?? [];
    const stock = variants.reduce((total, variant) => total + variant.stock, 0);
    const availabilityMatches = availability === "all" || (availability === "in-stock" && product.inStock && (variants.length === 0 || stock > 5)) || (availability === "low-stock" && product.inStock && variants.length > 0 && stock > 0 && stock <= 5) || (availability === "out-of-stock" && !product.inStock);
    const typeMatches = productType === "all" || (productType === "standard" && variants.length <= 1) || (productType === "variant-based" && variants.length > 1);
    return availabilityMatches && typeMatches;
  });
}
