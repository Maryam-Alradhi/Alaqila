import { createContext, useState, useEffect, useRef, useCallback } from "react";

export const CartContext = createContext<any>(null);

export function CartProvider({ children }: any) {
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("cart");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((item: any) => item && item.id) : [];
    } catch {
      return [];
    }
  });

  // ✅ كود الخصم المطبّق — يبقى معروض بالسلة ويُستخدم عند إتمام الطلب لحساب الإجمالي الصحيح
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(() => {
    try {
      const saved = localStorage.getItem("cartCoupon");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (coupon) localStorage.setItem("cartCoupon", JSON.stringify(coupon));
    else localStorage.removeItem("cartCoupon");
  }, [coupon]);

  const applyCoupon = useCallback((code: string, discount: number) => {
    setCoupon({ code, discount });
  }, []);
  const clearCoupon = useCallback(() => { setCoupon(null); }, []);

  // ✅ Fix: debounce localStorage writes — don't write on every render
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem("cart", JSON.stringify(cart));
    }, 300);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [cart]);

  // ✅ Fix: useCallback to stabilize references
  // ✅ Customized items (each with its own engraving/etc.) never merge with each other — only identical customization merges
  const sameLine = (a: any, b: any) =>
    a.id === b.id && a.selectedSize === b.selectedSize &&
    JSON.stringify(a.customization ?? null) === JSON.stringify(b.customization ?? null);

  const addToCart = useCallback((product: any) => {
    setCart(prev => {
      const existing = prev.find((item) => sameLine(item, product));
      if (existing) {
        return prev.map((item) =>
          sameLine(item, product) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const decreaseQuantity = useCallback((id: string, selectedSize?: string, customization?: any) => {
    setCart(prev =>
      prev
        .map((item) =>
          sameLine(item, { id, selectedSize, customization })
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((id: string, selectedSize?: string, customization?: any) => {
    setCart(prev =>
      prev.filter((item) => !sameLine(item, { id, selectedSize, customization }))
    );
  }, []);

  const clearCart = useCallback(() => { setCart([]); setCoupon(null); }, []);

  return (
    <CartContext.Provider value={{ cart, addToCart, decreaseQuantity, removeFromCart, clearCart, setCart, coupon, applyCoupon, clearCoupon }}>
      {children}
    </CartContext.Provider>
  );
}
