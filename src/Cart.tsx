import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { CartContext } from "./CartContext";
import { useToast } from "./Toast";

function Cart() {
  const { cart, addToCart, decreaseQuantity, removeFromCart, coupon, applyCoupon, clearCoupon } = useContext(CartContext);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [couponInput, setCouponInput] = useState(coupon?.code || "");
  const [couponSettings, setCouponSettings] = useState<{ enabled: boolean; code: string; discount: number } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "store")).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setCouponSettings({
        enabled: !!d.couponEnabled,
        code: String(d.couponCode || "").toUpperCase(),
        discount: Number(d.couponDiscount || 0),
      });
    }).catch(() => {});
  }, []);

  const subtotal = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const couponDiscount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const total = Math.max(0, subtotal - couponDiscount);

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { showToast("أدخل كود الخصم", "warning"); return; }
    setApplying(true);
    if (!couponSettings?.enabled || !couponSettings.code) {
      showToast("لا يوجد كود خصم فعّال حالياً", "error"); setApplying(false); return;
    }
    if (code !== couponSettings.code) {
      showToast("كود الخصم غير صحيح ❌", "error"); setApplying(false); return;
    }
    applyCoupon(code, couponSettings.discount);
    showToast("تم تطبيق كود الخصم ✅", "success");
    setApplying(false);
  };

  if (cart.length === 0)
    return (
      <div style={{ textAlign: "center", marginTop: "80px", padding: "20px" }}>
        <p style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</p>
        <h2 style={{ color: "#D4AF37" }}>السلة فارغة</h2>
        <p style={{ color: "#888", marginBottom: "24px" }}>أضف منتجات للسلة للمتابعة</p>
        <button onClick={() => navigate("/shop")} className="btn-3d"
          style={{ padding: "12px 30px", background: "#D4AF37", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}>
          تصفح المنتجات
        </button>
      </div>
    );

  return (
    <div style={{ padding: "24px 16px", maxWidth: "780px", margin: "0 auto", direction: "rtl" }}>
      <h1 className="font-display" style={{ color: "#D4AF37", marginBottom: "28px", fontSize: "26px", display: "flex", alignItems: "center", gap: "10px" }}>
        سلة المشتريات 🛒
      </h1>

      {cart.map((item: any, index: number) => (
        <div key={index} className="card" style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "14px", padding: "18px" }}>
          <div style={{ textAlign: "left", flexShrink: 0, order: 3 }}>
            <p style={{ color: "#D4AF37", fontWeight: "bold", margin: "0 0 8px", fontSize: "17px" }}>BD {(item.price * item.quantity).toFixed(3)}</p>
            <button onClick={() => { removeFromCart(item.id, item.selectedSize, item.customization); showToast("تم الحذف من السلة","info"); }}
              className="btn-3d"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
              حذف
            </button>
          </div>

          <div style={{ flex: 1, minWidth: 0, order: 2 }}>
            <h3 style={{ color: "#D4AF37", margin: "0 0 6px", fontSize: "15px", fontWeight: "700" }}>{item.name}</h3>
            {item.selectedSize && <p style={{ color: "#888", margin: "0 0 4px", fontSize: "12px" }}>المقاس: {item.selectedSize}</p>}
            {Array.isArray(item.customization) && item.customization.length > 0 && (
              <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px", padding: "6px 10px", margin: "0 0 6px" }}>
                {item.customization.map((c: any, ci: number) => (
                  <p key={ci} style={{ color: "#D4AF37", margin: 0, fontSize: "11px" }}>🎨 {c.label}: <span style={{ color: "#ccc" }}>{c.value}</span></p>
                ))}
              </div>
            )}
            <p style={{ color: "#ccc", margin: "0 0 10px", fontSize: "13px" }}>{item.price} BD للقطعة</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => addToCart(item)} className="btn-3d" style={qtyBtn}>+</button>
              <span style={{ color: "white", minWidth: "24px", textAlign: "center", fontWeight: "bold" }}>{item.quantity}</span>
              <button onClick={() => { decreaseQuantity(item.id, item.selectedSize, item.customization); }} className="btn-3d" style={qtyBtn}>−</button>
            </div>
          </div>

          {item.image && (
            <img src={item.image} style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "12px", flexShrink: 0, order: 1 }} alt={item.name} />
          )}
        </div>
      ))}

      {/* Summary */}
      <div className="card" style={{ padding: "22px", marginTop: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px" }}>
            <p style={{ color: "#888", fontSize: "13px", margin: "0 0 6px" }}>الإجمالي الفرعي</p>
            <p style={{ color: "white", fontSize: "20px", fontWeight: "800", margin: 0 }}>BD {subtotal.toFixed(3)}</p>
            {couponDiscount > 0 && (
              <p style={{ color: "#22c55e", fontSize: "13px", margin: "8px 0 0" }}>
                خصم (كود: {coupon.code}) 🏷️ <span style={{ marginRight: "6px" }}>- BD {couponDiscount.toFixed(3)}</span>
              </p>
            )}
          </div>

          <div style={{ flex: "1 1 240px" }}>
            <p style={{ color: "#888", fontSize: "13px", margin: "0 0 8px" }}>لديك كوبون خصم؟ 🏷️</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                className="inp"
                placeholder="أدخل كود الخصم"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                dir="ltr"
                style={{ flex: 1 }}
              />
              {coupon ? (
                <button onClick={() => { clearCoupon(); setCouponInput(""); showToast("تم إلغاء كود الخصم", "info"); }}
                  className="btn-3d" style={{ padding: "10px 18px", background: "transparent", border: "1px solid #333", borderRadius: "10px", color: "#ef4444", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}>
                  إلغاء
                </button>
              ) : (
                <button onClick={handleApplyCoupon} disabled={applying} className="btn-gold btn-3d" style={{ padding: "10px 20px", whiteSpace: "nowrap", fontSize: "13px" }}>
                  تطبيق
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #222", margin: "18px 0", paddingTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ color: "#888", fontSize: "13px" }}>الإجمالي الكلي</span>
            <span style={{ color: "#D4AF37", fontSize: "24px", fontWeight: "900" }}>BD {total.toFixed(3)}</span>
          </div>
          <p style={{ color: "#555", fontSize: "11px", margin: "4px 0 0" }}>رسوم التوصيل تُحسب بصفحة الدفع حسب طريقة الاستلام</p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/checkout")} className="btn-3d"
            style={{ flex: 1, minWidth: "120px", padding: "14px", background: "#D4AF37", color: "#000", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", fontSize: "15px" }}>
            إتمام الطلب ✨
          </button>
          <button onClick={() => navigate("/shop")} className="btn-3d"
            style={{ flex: 1, minWidth: "120px", padding: "14px", background: "transparent", color: "#aaa", border: "1px solid #333", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>
            ← متابعة التسوق
          </button>
        </div>
      </div>

      {/* Feature strip */}
      <div className="card" style={{ marginTop: "18px", padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {[
          { icon: "🎧", title: "دعم على مدار الساعة", desc: "فريق الدعم جاهز لمساعدتك 24/7" },
          { icon: "🔒", title: "دفع آمن", desc: "جميع عمليات الدفع مشفرة 100%" },
          { icon: "🚚", title: "شحن سريع", desc: "توصيل طلبك بسرعة داخل البحرين" },
          { icon: "💎", title: "جودة مضمونة", desc: "ضمان أصلية 925 على جميع المنتجات" },
        ].map((f, i, arr) => (
          <div key={f.title} style={{ textAlign: "center", padding: "20px 14px", borderInlineEnd: i < arr.length - 1 ? "1px solid #222" : "none" }}>
            <div style={{ fontSize: "22px", marginBottom: "8px" }}>{f.icon}</div>
            <p style={{ color: "#D4AF37", fontSize: "13px", fontWeight: "700", margin: "0 0 4px" }}>{f.title}</p>
            <p style={{ color: "#777", fontSize: "11px", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: "30px", height: "30px", background: "#D4AF37", border: "none",
  borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "16px",
  display: "flex", alignItems: "center", justifyContent: "center",
};

export default Cart;
