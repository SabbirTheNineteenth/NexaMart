import type { SellerCatalogRepository, SellerGalleryImageDeleteInput, SellerGalleryImageInput, SellerGalleryImageUpdateInput, SellerProductArchiveInput, SellerProductInput, SellerProductVariantDeleteInput, SellerProductVariantInput, SellerProductVariantUpdateInput } from "../seller-catalog.repository.js";

export class SellerCatalogService {
  constructor(private readonly repository: SellerCatalogRepository) {}

  async listProducts(sellerId: string) { return this.repository.listProducts(sellerId); }


  async updateStock(input: { sellerId: string; productId: string; stock: number }) {
    if (!Number.isInteger(input.stock) || input.stock < 0) throw new Error("Invalid stock");
    const updated = await this.repository.updateStock(input);
    if (!updated) throw new Error("Product not found");
  }

  async createProduct(input: SellerProductInput) { return this.repository.createProduct(input); }

  async updateProduct(input: import("../seller-catalog.repository.js").SellerProductUpdateInput) {
    const { sellerId: _sellerId, productId: _productId, ...editable } = input;
    if (Object.keys(editable).length === 0) throw new Error("Invalid product update");
    const product = await this.repository.updateProduct(input);
    if (!product) throw new Error("Product not found");
    return product;
  }

  async archiveProduct(input: SellerProductArchiveInput) {
    if (!await this.repository.archiveProduct(input)) throw new Error("Product not found");
  }

  async submitForReview(input: { sellerId: string; productId: string }) {
    const result = await this.repository.submitForReview(input);
    if (result.kind === "not_found") throw new Error("Product not found");
    if (result.kind === "invalid_state") throw new Error("Product cannot be submitted for review");
    return result.product;
  }

  async createVariant(input: SellerProductVariantInput) {
    const variant = await this.repository.createVariant(input);
    if (!variant) throw new Error("Product not found");
    return variant;
  }

  async listVariants(input: { sellerId: string; productId: string }) {
    const variants = await this.repository.listVariants(input);
    if (!variants) throw new Error("Product not found");
    return variants;
  }

  async updateVariant(input: SellerProductVariantUpdateInput) {
    const { sellerId: _sellerId, productId: _productId, variantId: _variantId, ...editable } = input;
    if (Object.keys(editable).length === 0) throw new Error("Invalid variant update");
    const variant = await this.repository.updateVariant(input);
    if (!variant) throw new Error("Variant not found");
    return variant;
  }

  async deleteVariant(input: SellerProductVariantDeleteInput) {
    if (!await this.repository.deleteVariant(input)) throw new Error("Variant not found");
  }

  async createGalleryImage(input: SellerGalleryImageInput) {
    const image = await this.repository.createGalleryImage(input);
    if (!image) throw new Error("Product not found");
    return image;
  }

  async listGalleryImages(input: { sellerId: string; productId: string }) {
    const images = await this.repository.listGalleryImages(input);
    if (!images) throw new Error("Product not found");
    return images;
  }

  async updateGalleryImage(input: SellerGalleryImageUpdateInput) {
    const { sellerId: _sellerId, productId: _productId, imageId: _imageId, ...editable } = input;
    if (Object.keys(editable).length === 0) throw new Error("Invalid gallery image update");
    const image = await this.repository.updateGalleryImage(input);
    if (!image) throw new Error("Gallery image not found");
    return image;
  }

  async deleteGalleryImage(input: SellerGalleryImageDeleteInput) {
    if (!await this.repository.deleteGalleryImage(input)) throw new Error("Gallery image not found");
  }
}
