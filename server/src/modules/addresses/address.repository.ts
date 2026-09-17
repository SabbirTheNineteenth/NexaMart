export type AddressInput = { recipientName: string; phone: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; country: string };
export type Address = AddressInput & { id: string; isDefault: boolean };
export type AddressUpdateInput = Partial<Omit<AddressInput, "line2" | "region" | "postalCode">> & { line2?: string | null; region?: string | null; postalCode?: string | null };

export type AddressRepository = {
  create(input: AddressInput & { accountId: string }): Promise<Address>;
  list(accountId: string): Promise<Address[]>;
  update(input: AddressUpdateInput & { accountId: string; addressId: string }): Promise<Address | null>;
  selectDefault(input: { accountId: string; addressId: string }): Promise<Address | null>;
  remove(input: { accountId: string; addressId: string }): Promise<void>;
};
