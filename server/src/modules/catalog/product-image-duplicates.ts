export type GalleryImageReference = { id: string; imageUrl: string };

export function normalizeProductImageUrl(value: string | undefined): string | undefined {
  const source = value?.trim();
  if (!source) return undefined;
  try {
    const url = new URL(source);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

export function isDuplicateGalleryImage(images: readonly GalleryImageReference[], imageUrl: string, excludedImageId?: string): boolean {
  const candidate = normalizeProductImageUrl(imageUrl);
  if (!candidate) return false;
  return images.some((image) => image.id !== excludedImageId && normalizeProductImageUrl(image.imageUrl) === candidate);
}
