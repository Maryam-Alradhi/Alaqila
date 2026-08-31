import { createContext, useState, useEffect, useCallback } from "react";

export const WishlistContext = createContext<any>(null);

export function WishlistProvider({ children }: any) {
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("wishlist");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((id: any) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  const isWishlisted = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const removeFromWishlist = useCallback((id: string) => {
    setWishlist(prev => prev.filter(x => x !== id));
  }, []);

  return (
    <WishlistContext.Provider value={{ wishlist, isWishlisted, toggleWishlist, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}
