export const orderItemSummary = (items: { productName: string; quantity: number }[]) =>
  items.map((item) => `${item.productName} ×${item.quantity}`).join(" · ");
