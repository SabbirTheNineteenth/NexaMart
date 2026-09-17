import type { CartProduct } from "@/types/catalog";

export type CartItem = CartProduct & { productId?: string; variantId?: string; quantity: number };
export type CartState = { items: CartItem[]; totalItems: number; subtotal: number };
export type CartAction =
  | { type: "add"; product: CartProduct & { productId?: string; variantId?: string } }
  | { type: "setQuantity"; id: string; quantity: number }
  | { type: "remove"; id: string }
  | { type: "hydrate"; items: CartItem[] }
  | { type: "clear" };

export const initialCart: CartState = { items: [], totalItems: 0, subtotal: 0 };

function totals(items: CartItem[]): CartState {
  return {
    items,
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
  };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  if (action.type === "clear") return initialCart;
  if (action.type === "hydrate") return totals(action.items);
  if (action.type === "add") {
    const current = state.items.find((item) => item.id === action.product.id);
    return totals(current
      ? state.items.map((item) => item.id === action.product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...state.items, { ...action.product, quantity: 1 }]);
  }
  if (action.type === "remove") return totals(state.items.filter((item) => item.id !== action.id));
  return totals(state.items.flatMap((item) => item.id === action.id && action.quantity <= 0 ? [] : item.id === action.id ? [{ ...item, quantity: action.quantity }] : [item]));
}
