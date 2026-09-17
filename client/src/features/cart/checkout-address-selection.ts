export type CheckoutShippingAddress = {
  id: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
};

export function selectShippingAddressId(addresses: CheckoutShippingAddress[], currentId: string | null) {
  if (currentId && addresses.some((address) => address.id === currentId)) return currentId;
  return addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? null;
}
