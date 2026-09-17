export type CatalogTaxonomyNode = { id: string; name: string; slug: string };
export type CatalogSubcategory = CatalogTaxonomyNode & { categoryId: string };
export type CatalogTaxonomy = {
  categories: CatalogTaxonomyNode[];
  subcategories: CatalogSubcategory[];
  brands: CatalogTaxonomyNode[];
};

export type CatalogDiscoveryFilters = {
  query: string;
  categoryName: string;
  subcategorySlug: string;
  brandSlug: string;
  sort?: "newest" | "";
};

export function catalogFiltersFromSearchParams(params: URLSearchParams): CatalogDiscoveryFilters {
  return {
    query: params.get("q") ?? "",
    categoryName: params.get("category") ?? "",
    subcategorySlug: params.get("subcategory") ?? "",
    brandSlug: params.get("brand") ?? "",
    sort: params.get("sort") === "newest" ? "newest" : "",
  };
}

export function catalogFiltersToSearchParams({ query, categoryName, subcategorySlug, brandSlug, sort = "" }: CatalogDiscoveryFilters, existing = new URLSearchParams()): URLSearchParams {
  const params = new URLSearchParams(existing);
  for (const key of ["q", "category", "subcategory", "brand", "sort"]) params.delete(key);
  if (query.trim()) params.set("q", query.trim());
  if (categoryName) params.set("category", categoryName);
  if (subcategorySlug) params.set("subcategory", subcategorySlug);
  if (brandSlug) params.set("brand", brandSlug);
  if (sort === "newest") params.set("sort", sort);
  return params;
}

export function buildCatalogDiscoveryPath(filters: CatalogDiscoveryFilters): string {
  const params = catalogFiltersToSearchParams(filters);
  const search = params.toString();
  return search ? `/catalog/products?${search}` : "/catalog/products";
}

export function catalogDiscoveryFacets(taxonomy: CatalogTaxonomy, filters: CatalogDiscoveryFilters) {
  const category = taxonomy.categories.find((item) => item.name === filters.categoryName);
  const subcategories = category ? taxonomy.subcategories.filter((item) => item.categoryId === category.id) : [];
  const applied = [
    category?.name,
    subcategories.find((item) => item.slug === filters.subcategorySlug)?.name,
    taxonomy.brands.find((item) => item.slug === filters.brandSlug)?.name,
  ].filter((item): item is string => Boolean(item));
  return { subcategories, applied };
}
