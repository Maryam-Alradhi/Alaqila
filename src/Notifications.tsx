import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string,string> = {
  pending:"#f59e0b", confirmed:"#22c55e", on_the_way:"#3b82f6",
  delivered:"#8b5cf6", collected:"#8b5cf6", rejected:"#ef4444",
};

export default function Notifications() {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [allNew,        setAllNew]        = useState<any[]>([]);
  const [soundEnabled,  setSoundEnabled]  = useState(true);
  const prevCount = useRef(0);
  const navigate = useNavigate();

  // Real-time listener for pending orders
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingOrders(orders);
      // Play sound on new order
      if (orders.length > prevCount.current && prevCount.current >= 0 && soundEnabled) {
        playNotifSound();
      }
      prevCount.current = orders.length;
    });
    return unsub;
  }, [soundEnabled]);

  // Recent all orders
  useEffect(() => {
    const q = query(collection(db,"orders"), orderBy("createdAt","desc"), limit(20));
    const unsub = onSnapshot(q, snap => {
      setAllNew(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const playNotifSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch { /* ignore */ }
  };

  const timeAgo = (date: any) => {
    if (!date?.toDate) return "—";
    const diff = Date.now() - date.toDate().getTime();
    const m = Math.floor(diff/60000);
    if (m < 1) return "الآن";
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.floor(m/60);
    if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${Math.floor(h/24)} يوم`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px", flexWrap:"wrap", gap:"10px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <h3 style={{ color:"var(--text)", fontSize:"15px", fontWeight:"700", margin:0 }}>
            🔔 الإشعارات الحية
          </h3>
          {pendingOrders.length > 0 && (
            <span style={{ background:"#ef4444", color:"white", borderRadius:"99px", padding:"2px 8px", fontSize:"11px", fontWeight:"800", animation:"notifyPop 0.4s ease" }}>
              {pendingOrders.length} جديد
            </span>
          )}
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{ padding:"7px 14px", background:soundEnabled?"rgba(212,175,55,0.1)":"transparent", border:`1px solid ${soundEnabled?"var(--gold-border)":"var(--border)"}`, borderRadius:"var(--radius-sm)", color:soundEnabled?"var(--gold)":"var(--text-muted)", cursor:"pointer", fontSize:"12px", fontWeight:"600", fontFamily:"inherit" }}>
          {soundEnabled ? "🔊 صوت مفعّل" : "🔇 صوت معطّل"}
        </button>
      </div>

      {/* Pending alerts */}
      {pendingOrders.length > 0 && (
        <div style={{ marginBottom:"20px" }}>
          <p className="section-title" style={{ color:"#f59e0b" }}>⚠️ طلبات تنتظر مراجعتك</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {pendingOrders.map(order => (
              <div key={order.id}
                style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"var(--radius)", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", cursor:"pointer", transition:"var(--transition)" }}
                onClick={() => navigate("/manage-store-aqeela")}
                onMouseEnter={e => e.currentTarget.style.background="rgba(245,158,11,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(245,158,11,0.06)"}>
                <div>
                  <p style={{ color:"#f59e0b", fontWeight:"700", fontSize:"14px", margin:0 }}>#{order.orderNumber}</p>
                  <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"3px 0 0" }}>
                    {order.customer?.name} · {timeAgo(order.createdAt)}
                  </p>
                </div>
                <div style={{ textAlign:"left" }}>
                  <p style={{ color:"var(--gold)", fontWeight:"800", fontSize:"15px", margin:0 }}>{(order.total||0).toFixed(3)} BD</p>
                  <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"2px 0 0" }}>{order.deliveryType==="delivery"?"🚗 توصيل":"🤝 استلام"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingOrders.length === 0 && (
        <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"var(--radius)", padding:"16px", marginBottom:"20px", display:"flex", gap:"10px", alignItems:"center" }}>
          <span style={{ fontSize:"24px" }}>✅</span>
          <p style={{ color:"#22c55e", fontSize:"13px", margin:0 }}>كل الطلبات تمت مراجعتها — لا يوجد طلبات معلّقة</p>
        </div>
      )}

      {/* Recent activity */}
      <p className="section-title">🕐 آخر النشاطات</p>
      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {allNew.slice(0,15).map(order => {
          const c = statusColors[order.status] || "#888";
          return (
            <div key={order.id} style={{ display:"flex", gap:"12px", alignItems:"center", padding:"10px 12px", background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", transition:"var(--transition)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="var(--border-hover)"}
              onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:c, flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:"var(--text)", fontSize:"12px", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  <span style={{ color:"var(--gold)", fontWeight:"700" }}>#{order.orderNumber}</span> — {order.customer?.name||"—"}
                </p>
              </div>
              <span style={{ color:"var(--text-muted)", fontSize:"11px", flexShrink:0 }}>{timeAgo(order.createdAt)}</span>
              <span style={{ background:c+"22", color:c, fontSize:"10px", padding:"2px 7px", borderRadius:"99px", border:`1px solid ${c}33`, flexShrink:0, fontWeight:"700" }}>
                {order.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
