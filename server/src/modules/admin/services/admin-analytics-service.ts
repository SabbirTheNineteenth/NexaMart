import type { AdminAnalyticsRepository } from "../admin-analytics.repository.js";

export class AdminAnalyticsService {
  constructor(private readonly repository: AdminAnalyticsRepository) {}

  overview() {
    return this.repository.overview();
  }
}
