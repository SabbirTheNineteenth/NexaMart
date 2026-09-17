type SellerAnalyticsRepository = { overview(sellerId: string): Promise<unknown> };

export class SellerAnalyticsService {
  constructor(private readonly repository: SellerAnalyticsRepository) {}

  overview(sellerId: string) {
    return this.repository.overview(sellerId);
  }
}
