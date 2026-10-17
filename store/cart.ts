import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  image?: string;
  price: number;
  mrp: number;
  quantity: number;
  maxStock?: number;
  variant?: string;
}

export interface CouponData {
  code: string;
  discount: number;
  description?: string;
}

interface CartState {
  items: CartItem[];
  couponCode: string;
  couponDiscount: number;
  coupon: CouponData | null;

  // Actions
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (idOrProductId: string, variantId?: string) => void;
  updateQuantity: (
    idOrProductId: string,
    variantOrQuantity: string | number | undefined,
    maybeQuantity?: number
  ) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  setCoupon: (coupon: CouponData | null) => void;

  // Computed
  getSubtotal: () => number;
  getItemCount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: "",
      couponDiscount: 0,
      coupon: null,

      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );

          if (existingIndex >= 0) {
            const updated = [...state.items];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: Math.min(
                updated[existingIndex].quantity + item.quantity,
                item.maxStock || 99
              ),
            };
            return { items: updated };
          }

          const newItem: CartItem = {
            ...item,
            id: `${item.productId}-${item.variantId || "default"}`,
          };

          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (idOrProductId, variantId) => {
        set((state) => ({
          items: state.items.filter((i) => {
            if (i.id === idOrProductId) return false;
            if (i.productId === idOrProductId && (!variantId || i.variantId === variantId)) return false;
            return true;
          }),
        }));
      },

      updateQuantity: (idOrProductId, variantOrQty, maybeQty) => {
        let qty: number;
        let variantId: string | undefined;

        if (typeof variantOrQty === "number") {
          qty = variantOrQty;
        } else {
          variantId = variantOrQty;
          qty = maybeQty ?? 1;
        }

        if (qty <= 0) {
          get().removeItem(idOrProductId, variantId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === idOrProductId) return { ...item, quantity: qty };
            if (item.productId === idOrProductId && (!variantId || item.variantId === variantId)) {
              return { ...item, quantity: qty };
            }
            return item;
          }),
        }));
      },

      clearCart: () => set({ items: [], couponCode: "", couponDiscount: 0, coupon: null }),

      applyCoupon: (code, discount) =>
        set({
          couponCode: code,
          couponDiscount: discount,
          coupon: { code, discount },
        }),

      removeCoupon: () =>
        set({ couponCode: "", couponDiscount: 0, coupon: null }),

      setCoupon: (coupon) =>
        set({
          coupon,
          couponCode: coupon?.code || "",
          couponDiscount: coupon?.discount || 0,
        }),

      getSubtotal: () =>
        get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const shipping = subtotal > 499 ? 0 : 40;
        return Math.max(0, subtotal - get().couponDiscount + shipping);
      },
    }),
    {
      name: "shopzen-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
