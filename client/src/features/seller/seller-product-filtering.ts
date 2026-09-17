import type { SellerProduct } from "@/types/seller";

export type SellerProductFilterStatus = "all" | "published" | "draft";

export type SellerProductFilters = {
  query: string;
  categoryId: string;
  status: SellerProductFilterStatus;
};

export function filterSellerProducts(products: SellerProduct[], filters: SellerProductFilters): SellerProduct[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return products.filter((product) => {
    const searchableText = `${product.name} ${product.brand ?? ""}`.toLocaleLowerCase();
    const matchesQuery = !query || searchableText.includes(query);
    const matchesCategory = filters.categoryId === "all"
      || (filters.categoryId === "uncategorized" ? !product.categoryId : product.categoryId === filters.categoryId);
    const matchesStatus = filters.status === "all"
      || (filters.status === "published" ? product.isPublished : !product.isPublished);

    return matchesQuery && matchesCategory && matchesStatus;
  });
}
