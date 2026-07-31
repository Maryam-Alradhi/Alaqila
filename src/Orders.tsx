import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const statusColors: Record<string,string> = {
  pending:"#f59e0b", confirmed:"#22c55e", on_the_way:"#3b82f6",
  delivered:"#8b5cf6", collected:"#8b5cf6", rejected:"#ef4444",
};
const statusLabels: Record<string,string> = {
  pending:"⏳ قيد المراجعة", confirmed:"✅ مؤكد",
  on_the_way:"🚗 في الطريق", delivered:"📦 تم التوصيل",
  collected:"🤝 تم الاستلام", rejected:"❌ مرفوض",
};

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    (async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { setOrders([]); }
      finally { setLoading(false); }
    })();
  }, [user]);

  if (loading) return (
    <div style={{ minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div className="animate-spin" style={{ width:"40px", height:"40px", border:"3px solid var(--border)", borderTop:"3px solid var(--gold)", borderRadius:"50%", margin:"0 auto 16px" }} />
        <p style={{ color:"var(--text-muted)" }}>جاري التحميل...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", padding:"32px 16px", direction:"rtl" }}>
      <div style={{ maxWidth:"680px", margin:"0 auto" }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"24px", flexWrap:"wrap", gap:"10px" }}>
          <h1 className="font-display" style={{ color:"var(--gold)", fontSize:"22px", fontWeight:"800" }}>📦 طلباتي</h1>
          <button onClick={() => navigate("/shop")} className="btn-ghost" style={{ fontSize:"13px", padding:"8px 16px" }}>
            🛍️ تسوق مجدداً
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="card animate-slideUp" style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:"56px", marginBottom:"16px" }}>📭</div>
            <h3 style={{ color:"var(--text)", marginBottom:"8px" }}>لا توجد طلبات بعد</h3>
            <p style={{ color:"var(--text-muted)", marginBottom:"24px", fontSize:"14px" }}>ابدأ تسوقك الآن واستمتع بأفخم المجوهرات</p>
            <button onClick={() => navigate("/shop")} className="btn-gold">تصفح المتجر ✨</button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            {orders.map((order, i) => {
              const color = statusColors[order.status] || "#888";
              const isOpen = expanded === order.id;
              return (
                <div key={order.id} className="animate-slideUp card" style={{ animationDelay:`${i*0.05}s`, padding:0, overflow:"hidden" }}>
                  {/* Header */}
                  <div onClick={() => setExpanded(isOpen ? null : order.id)}
                    style={{ padding:"16px 18px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", flex:1, minWidth:0 }}>
                      <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:color+"22", border:`1.5px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>
                        {order.status==="delivered"||order.status==="collected" ? "✅" : order.status==="rejected" ? "❌" : "📦"}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ color:"var(--gold)", fontWeight:"700", fontSize:"14px", margin:0 }}>#{order.orderNumber}</p>
                        <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"2px 0 0" }}>
                          {order.createdAt?.toDate?.()?.toLocaleDateString("ar-BH")||"—"} · {(order.items||[]).length} منتج
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign:"left", flexShrink:0 }}>
                      <p style={{ color:"var(--gold)", fontWeight:"800", fontSize:"15px", margin:0 }}>{(order.total||0).toFixed(3)} BD</p>
                      <span style={{ background:color+"22", color, fontSize:"10px", fontWeight:"700", padding:"2px 8px", borderRadius:"99px", border:`1px solid ${color}33` }}>
                        {statusLabels[order.status]||order.status}
                      </span>
                    </div>
                    <span style={{ color:"var(--text-muted)", fontSize:"18px", flexShrink:0, transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"var(--transition)" }}>›</span>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div style={{ borderTop:"1px solid var(--border)", padding:"16px 18px", background:"rgba(0,0,0,0.2)" }} className="animate-fadeIn">
                      {(order.items||[]).map((item:any,j:number) => (
                        <div key={j} style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                            {item.image && <img src={item.image} style={{ width:"40px",height:"40px",objectFit:"cover",borderRadius:"8px",flexShrink:0 }} alt="" />}
                            <div style={{ flex:1 }}>
                              <p style={{ color:"var(--text)", fontSize:"13px", margin:0 }}>{item.name}{item.selectedSize&&` (م${item.selectedSize})`}</p>
                              <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"2px 0 0" }}>× {item.quantity}</p>
                            </div>
                            <span style={{ color:"var(--gold)", fontSize:"13px", fontWeight:"700" }}>{(item.price*item.quantity).toFixed(3)} BD</span>
                          </div>
                          {Array.isArray(item.customization) && item.customization.length > 0 && (
                            <div style={{ marginTop:"6px", marginRight:"50px" }}>
                              {item.customization.map((c:any,ci:number)=>(
                                <p key={ci} style={{ color:"var(--gold)", fontSize:"11px", margin:0 }}>🎨 {c.label}: <span style={{ color:"var(--text-muted)" }}>{c.value}</span></p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", paddingTop:"10px", marginTop:"4px" }}>
                        <button onClick={() => navigate(`/track/${order.orderNumber}`)}
                          style={{ padding:"8px 16px", background:"var(--gold-dim)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius-sm)", color:"var(--gold)", cursor:"pointer", fontSize:"12px", fontWeight:"600", fontFamily:"inherit" }}>
                          📍 تتبع الطلب
                        </button>
                        <span style={{ color:"var(--text)", fontWeight:"700", fontSize:"15px", alignSelf:"center" }}>
                          {(order.total||0).toFixed(3)} BD
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
