import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "./CartContext";
import { useToast } from "./Toast";

function Cart() {
  const { cart, addToCart, decreaseQuantity, removeFromCart } = useContext(CartContext);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const subtotal = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

  if (cart.length === 0)
    return (
      <div style={{ textAlign: "center", marginTop: "80px", padding: "20px" }}>
        <p style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</p>
        <h2 style={{ color: "#D4AF37" }}>السلة فارغة</h2>
        <p style={{ color: "#888", marginBottom: "24px" }}>أضف منتجات للسلة للمتابعة</p>
        <button onClick={() => navigate("/shop")}
          style={{ padding: "12px 30px", background: "#D4AF37", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}>
          تصفح المنتجات
        </button>
      </div>
    );

  return (
    <div style={{ padding: "24px 16px", maxWidth: "680px", margin: "0 auto", direction: "rtl" }}>
      <h1 style={{ color: "#D4AF37", marginBottom: "24px", fontSize: "20px" }}>🛒 سلة المشتريات</h1>

      {cart.map((item: any, index: number) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px", background: "#111", padding: "14px", borderRadius: "14px", border: "1px solid #222" }}>
          {item.image && (
            <img src={item.image} style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "10px", flexShrink: 0 }} alt={item.name} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ color: "#D4AF37", margin: "0 0 4px", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</h3>
            {item.selectedSize && <p style={{ color: "#888", margin: "0 0 4px", fontSize: "12px" }}>المقاس: {item.selectedSize}</p>}
            <p style={{ color: "#ccc", margin: "0 0 8px", fontSize: "13px" }}>{item.price} BD للقطعة</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => { decreaseQuantity(item.id, item.selectedSize); }} style={qtyBtn}>−</button>
              <span style={{ color: "white", minWidth: "24px", textAlign: "center", fontWeight: "bold" }}>{item.quantity}</span>
              <button onClick={() => addToCart(item)} style={qtyBtn}>+</button>
            </div>
          </div>
          <div style={{ textAlign: "left", flexShrink: 0 }}>
            <p style={{ color: "#D4AF37", fontWeight: "bold", margin: "0 0 8px", fontSize: "15px" }}>{(item.price * item.quantity).toFixed(3)} BD</p>
            <button onClick={() => { removeFromCart(item.id, item.selectedSize); showToast("تم الحذف من السلة","info"); }}
              style={{ background: "#ef444411", color: "#ef4444", border: "1px solid #ef444433", padding: "5px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>
              حذف
            </button>
          </div>
        </div>
      ))}

      {/* Summary */}
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: "14px", padding: "18px", marginTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: "14px", marginBottom: "8px" }}>
          <span>المجموع الفرعي</span><span>{subtotal.toFixed(3)} BD</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: "13px", marginBottom: "14px" }}>
          <span>🚗 رسوم التوصيل</span><span style={{ color: "#f59e0b" }}>+2.000 BD (إذا اخترت توصيل)</span>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/shop")}
            style={{ flex: 1, minWidth: "120px", padding: "12px", background: "transparent", color: "#aaa", border: "1px solid #333", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>
            ← متابعة التسوق
          </button>
          <button onClick={() => navigate("/checkout")}
            style={{ flex: 1, minWidth: "120px", padding: "12px", background: "#D4AF37", color: "#000", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
            إتمام الطلب 🚀
          </button>
        </div>
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
