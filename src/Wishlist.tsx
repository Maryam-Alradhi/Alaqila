import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { WishlistContext } from "./WishlistContext";
import { CartContext } from "./CartContext";
import { useToast } from "./Toast";

function Wishlist() {
  const { wishlist, removeFromWishlist } = useContext(WishlistContext);
  const { addToCart } = useContext(CartContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.all(
        wishlist.map((id: string) => getDoc(doc(db, "products", id)).catch(() => null))
      );
      if (cancelled) return;
      setProducts(results.filter((s): s is any => !!s && s.exists()).map(s => ({ id: s.id, ...s.data() })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [wishlist]);

  const quickAdd = (product: any) => {
    const needsRingSize = product.category === "rings" && !product.customizable;
    const needsNecklaceType = product.category === "necklace" && Array.isArray(product.necklaceTypes) && product.necklaceTypes.length > 0;
    if (needsRingSize || needsNecklaceType || product.customizable) {
      navigate(`/product/${product.id}`);
      return;
    }
    addToCart(product);
    showToast(`تمت إضافة "${product.name}" للسلة 🛒`, "success");
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>جاري التحميل...</div>
  );

  if (products.length === 0) return (
    <div style={{ textAlign: "center", marginTop: "80px", padding: "20px" }}>
      <p style={{ fontSize: "48px", marginBottom: "16px" }}>💛</p>
      <h2 style={{ color: "var(--gold)" }}>قائمة المفضلة فاضية</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>احفظي المنتجات اللي يعجبك بالضغط على ♡</p>
      <button onClick={() => navigate("/shop")} className="btn-gold btn-3d" style={{ padding: "12px 30px" }}>
        تصفح المنتجات
      </button>
    </div>
  );

  return (
    <div style={{ padding: "24px 16px 60px", maxWidth: "1100px", margin: "0 auto", direction: "rtl" }}>
      <h1 className="font-display" style={{ color: "var(--gold)", marginBottom: "24px", fontSize: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
        💛 المفضلة
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "20px" }}>
        {products.map(product => {
          const soldOut = Number(product.quantity ?? 0) === 0;
          return (
            <div key={product.id} className="product-card animate-slideUp" style={{ position: "relative" }}>
              <button onClick={() => removeFromWishlist(product.id)} className="btn-3d"
                style={{ position: "absolute", top: "8px", left: "8px", zIndex: 2, width: "30px", height: "30px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", color: "#ef4444", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
              <div onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: "pointer" }}>
                {soldOut && <div className="badge-overlay badge-red">Sold Out</div>}
                <img src={product.image} loading="lazy" style={{ width: "100%", height: "200px", objectFit: "cover", opacity: soldOut ? 0.4 : 1 }} alt={product.name} />
                <div style={{ padding: "13px" }}>
                  <h3 style={{ color: "var(--gold)", margin: "0 0 4px", fontSize: "14px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</h3>
                  <p style={{ color: "var(--text-dim)", margin: "0 0 10px", fontSize: "13px", fontWeight: "600" }}>{product.price} BD</p>
                </div>
              </div>
              {!soldOut && (
                <button onClick={() => quickAdd(product)} className="btn-3d"
                  style={{ width: "calc(100% - 26px)", margin: "0 13px 13px", padding: "8px", background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid var(--gold-border)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                  🛒 أضف للسلة
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Wishlist;
