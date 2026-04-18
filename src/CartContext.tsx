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
  const addToCart = useCallback((product: any) => {
    setCart(prev => {
      const existing = prev.find(
        (item) => item.id === product.id && item.selectedSize === product.selectedSize
      );
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.selectedSize === product.selectedSize
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const decreaseQuantity = useCallback((id: string, selectedSize?: string) => {
    setCart(prev =>
      prev
        .map((item) =>
          item.id === id && item.selectedSize === selectedSize
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((id: string, selectedSize?: string) => {
    setCart(prev =>
      prev.filter((item) => !(item.id === id && item.selectedSize === selectedSize))
    );
  }, []);

  const clearCart = useCallback(() => { setCart([]); }, []);

  return (
    <CartContext.Provider value={{ cart, addToCart, decreaseQuantity, removeFromCart, clearCart, setCart }}>
      {children}
    </CartContext.Provider>
  );
}
