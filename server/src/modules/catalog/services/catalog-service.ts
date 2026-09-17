import type { CatalogListFilters, CatalogRepository } from "../catalog.repository.js";

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async list(filters: CatalogListFilters = {}) {
    return this.repository.list(filters);
  }

  async bySlug(slug: string) {
    return this.repository.bySlug(slug);
  }

  async listStores() {
    return this.repository.listStores();
  }

  async storeBySlug(slug: string) {
    return this.repository.storeBySlug(slug);
  }
}
