export type SellerProfileStatus = "pending" | "approved" | "rejected" | "suspended" | "active";

export type SellerProfile = {
  id: string;
  accountId: string;
  storeName: string;
  storeSlug: string;
  description?: string;
  status: SellerProfileStatus;
  createdAt: string;
};

export type SellerProfileRepository = {
  findByAccountId(accountId: string): Promise<SellerProfile | null>;
  findByStoreName(storeName: string): Promise<SellerProfile | null>;
  createApplication(input: { accountId: string; storeName: string; storeSlug: string; description?: string }): Promise<SellerProfile>;
  updateStoreProfile(input: { accountId: string; storeName?: string; description?: string }): Promise<SellerProfile | null>;
};
