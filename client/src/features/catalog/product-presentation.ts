type ProductPresentationInput = {
  category: string;
  description?: string;
  colors?: string[];
  brand?: string;
};

export type ProductPresentation = {
  brand?: string;
  category: string;
  description?: string;
  specification?: string;
};

export function buildProductPresentation(product: ProductPresentationInput): ProductPresentation {
  const description = product.description?.trim() || undefined;
  const colors = product.colors?.map((color) => color.trim()).filter(Boolean) ?? [];

  return {
    brand: product.brand?.trim() || undefined,
    category: product.category,
    description,
    specification: colors.length ? colors.join(" + ") : undefined,
  };
}

export function imageSourceFor(image: string | undefined): string | undefined {
  const source = image?.trim();
  if (!source) return undefined;

  try {
    const url = new URL(source);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function productImageSource(image: string | undefined, _productId: string): string | undefined {
  return imageSourceFor(image);
}
