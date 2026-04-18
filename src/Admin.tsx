import { useEffect, useState, useRef } from "react";
import { collection, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot, writeBatch, increment, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./firebase";
import { useToast } from "./Toast";
import { awardLoyaltyBalance } from "./LoyaltyService";
import ManageProducts from "./ManageProducts";
import TelegramSettings from "./TelegramSettings";
import StoreSettings from "./StoreSettings";
import Customers from "./Customers";
import Notifications from "./Notifications";

type Tab = "orders"|"products"|"customers"|"stats"|"notifications"|"telegram"|"store";
type OrderStatus = "pending"|"confirmed"|"on_the_way"|"delivered"|"collected"|"rejected";

const deliverySteps = ["pending","confirmed","on_the_way","delivered"];
const pickupSteps   = ["pending","confirmed","collected"];

const statusLabels: Record<string,string> = {
  pending:"بانتظار المراجعة", confirmed:"مؤكد",
  on_the_way:"في الطريق", delivered:"تم التوصيل",
  collected:"تم الاستلام", rejected:"مرفوض",
};
const statusIcons: Record<string,string> = {
  pending:"⏳", confirmed:"✅", on_the_way:"🚗",
  delivered:"📦", collected:"🤝", rejected:"❌",
};
const statusColors: Record<string,string> = {
  pending:"#f59e0b", confirmed:"#22c55e", on_the_way:"#3b82f6",
  delivered:"#8b5cf6", collected:"#8b5cf6", rejected:"#ef4444",
};

const navItems: { key: Tab; icon: string; label: string; group?: string }[] = [
  { key:"orders",        icon:"📦", label:"الطلبات",         group:"main" },
  { key:"products",      icon:"💍", label:"المنتجات",        group:"main" },
  { key:"customers",     icon:"👥", label:"العملاء",         group:"main" },
  { key:"notifications", icon:"🔔", label:"الإشعارات",       group:"main" },
  { key:"stats",         icon:"📊", label:"الإحصائيات",      group:"main" },
  { key:"store",         icon:"⚙️", label:"إعدادات المتجر",  group:"settings" },
  { key:"telegram",      icon:"✈️", label:"إعدادات Telegram",group:"settings" },
];

export default function Admin() {
  const [tab,         setTab]         = useState<Tab>("orders");
  const [orders,      setOrders]      = useState<any[]>([]);
  const [filter,      setFilter]      = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { showToast } = useToast();

  // ✅ Fix: single onSnapshot for ALL orders — replaces getDocs + separate pending listener
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const q = query(collection(db,"orders"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => { setLoading(false); });
    unsubRef.current = unsub;
    return () => unsub();
  }, []);

  // ✅ Derived from orders state — no extra listener needed
  const pendingCount = orders.filter(o => o.status === "pending").length;

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      const order = orders.find(o => o.id === id);

      const batch = writeBatch(db);
      batch.update(doc(db,"orders",id), {status});

      // عند التأكيد: قلّل الكمية (الأدمن عنده صلاحية)
      if (status === "confirmed" && order && !order.stockDeducted) {
        for (const item of (order.items || [])) {
          if (!item?.id) continue;
          const snap = await getDoc(doc(db,"products",item.id));
          if (!snap.exists()) continue;
          const data: any = snap.data() || {};
          const size = typeof item.selectedSize === "string" ? item.selectedSize : null;
          const ref = doc(db,"products",item.id);
          if (data.sizes && size && data.sizes[size] !== undefined)
            batch.update(ref, { [`sizes.${size}`]: increment(-(item.quantity || 0)) });
          else
            batch.update(ref, { quantity: increment(-(item.quantity || 0)) });
        }
        // سجّل إن الكمية اتخصمت
        batch.update(doc(db,"orders",id), { status, stockDeducted: true });
      }

      // عند الرفض: استرجع الكمية (فقط لو اتخصمت)
      if (status === "rejected" && order && order.stockDeducted) {
        for (const item of (order.items || [])) {
          if (!item?.id) continue;
          const snap = await getDoc(doc(db,"products",item.id));
          if (!snap.exists()) continue;
          const data: any = snap.data() || {};
          const size = typeof item.selectedSize === "string" ? item.selectedSize : null;
          const ref = doc(db,"products",item.id);
          if (data.sizes && size && data.sizes[size] !== undefined)
            batch.update(ref, { [`sizes.${size}`]: increment(item.quantity || 0) });
          else
            batch.update(ref, { quantity: increment(item.quantity || 0) });
        }
        batch.update(doc(db,"orders",id), { status, stockDeducted: false });
      }

      await batch.commit();

      showToast(`${statusIcons[status]} ${statusLabels[status]}`, "success");

      // Award loyalty balance when order is completed
      if (status === "delivered" || status === "collected") {
        if (order) {
          const reward = await awardLoyaltyBalance({ ...order, status, id });
          if (reward) {
            showToast(`🎁 تم إضافة ${reward} BD كرصيد مكافأة للعميل`, "success");
          }
        }
      }
    } catch { showToast("فشل التحديث", "error"); }
  };

  const deleteOrder = async (id: string) => {
    if (!window.confirm("تأكيد الحذف؟")) return;
    try {
      await deleteDoc(doc(db,"orders",id));
      showToast("تم الحذف", "info");
    } catch { showToast("فشل الحذف", "error"); }
  };

  const exportCSV = () => {
    const header = ["رقم الطلب","الاسم","الهاتف","العنوان","الدفع","النوع","الحالة","الإجمالي","التاريخ"];
    const rows = filtered.map(o => [
      o.orderNumber||"", o.customer?.name||"", o.customer?.phone||"",
      o.customer?.address||"", o.paymentMethod==="benefit"?"بنفت":"كاش",
      o.deliveryType==="delivery"?"توصيل":"استلام",
      statusLabels[o.status]||o.status, (o.total||0).toFixed(3),
      o.createdAt?.toDate?.()?.toLocaleDateString("ar-BH")||"",
    ]);
    const csv = [header,...rows].map(r=>r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
    a.download = `orders-${Date.now()}.csv`; a.click();
    showToast("تم التصدير 📊","success");
  };

  const filtered = orders
    .filter(o => filter==="all" ? true : o.status===filter)
    .filter(o => {
      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      return o.orderNumber?.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q) || o.customer?.phone?.includes(q);
    });

  const totalRevenue = orders.filter(o=>o.status!=="rejected").reduce((s,o)=>s+(o.total||0),0);
  const todayRevenue = orders.filter(o=>o.status!=="rejected"&&o.createdAt?.toDate?.()?.toDateString()===new Date().toDateString()).reduce((s,o)=>s+(o.total||0),0);
  const doneCount    = orders.filter(o=>o.status==="delivered"||o.status==="collected").length;

  const SIDEBAR_W = sidebarOpen ? "220px" : "60px";

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)", direction:"rtl", fontFamily:"'Cairo',sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width:SIDEBAR_W, minHeight:"100vh", background:"#080b14",
        borderLeft:"1px solid var(--border)", flexShrink:0,
        display:"flex", flexDirection:"column",
        transition:"width 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow:"hidden", position:"sticky", top:0, height:"100vh",
      }}>
        <div style={{ padding:"18px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"10px", minHeight:"64px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(135deg,#D4AF37,#a07020)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0 }}>💍</div>
          {sidebarOpen && <span style={{ color:"var(--gold)", fontWeight:"800", fontSize:"14px", whiteSpace:"nowrap" }}>لوحة العقيلة</span>}
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ marginRight:"auto", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", fontSize:"16px", flexShrink:0, padding:"4px" }}>
            {sidebarOpen ? "◄" : "►"}
          </button>
        </div>

        <div style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:"2px", overflowY:"auto" }}>
          {["main","settings"].map(group => (
            <div key={group}>
              {sidebarOpen && (
                <p style={{ color:"var(--text-muted)", fontSize:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", padding:"10px 8px 4px" }}>
                  {group==="main"?"الرئيسية":"الإعدادات"}
                </p>
              )}
              {navItems.filter(n=>n.group===group).map(item => {
                const active = tab === item.key;
                return (
                  <button key={item.key} onClick={()=>setTab(item.key)} title={item.label}
                    style={{
                      width:"100%", padding: sidebarOpen ? "10px 12px" : "10px", borderRadius:"10px",
                      border:"none", background:active?"rgba(212,175,55,0.12)":"transparent",
                      color:active?"var(--gold)":"var(--text-muted)",
                      cursor:"pointer", fontSize:"13px", fontWeight:active?"700":"500",
                      display:"flex", alignItems:"center", gap:"10px",
                      transition:"var(--transition)", fontFamily:"inherit",
                      position:"relative", textAlign:"right",
                    }}
                    onMouseEnter={e => !active && (e.currentTarget.style.background="rgba(255,255,255,0.04)")}
                    onMouseLeave={e => !active && (e.currentTarget.style.background="transparent")}>
                    <span style={{ fontSize:"16px", flexShrink:0 }}>{item.icon}</span>
                    {sidebarOpen && <span style={{ whiteSpace:"nowrap" }}>{item.label}</span>}
                    {item.key==="notifications" && pendingCount>0 && (
                      <span style={{ marginRight:"auto", background:"#ef4444", color:"white", borderRadius:"99px", padding:"1px 6px", fontSize:"10px", fontWeight:"800", minWidth:"18px", textAlign:"center" }}>
                        {pendingCount}
                      </span>
                    )}
                    {active && <div style={{ position:"absolute", left:0, top:"20%", height:"60%", width:"3px", background:"var(--gold)", borderRadius:"0 4px 4px 0" }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ padding:"10px 8px", borderTop:"1px solid var(--border)" }}>
          <button onClick={()=>signOut(auth)} title="تسجيل الخروج"
            style={{ width:"100%", padding: sidebarOpen?"10px 12px":"10px", borderRadius:"10px", border:"none", background:"transparent", color:"#ef4444", cursor:"pointer", fontSize:"13px", display:"flex", alignItems:"center", gap:"10px", fontFamily:"inherit", transition:"var(--transition)" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            <span style={{ fontSize:"16px", flexShrink:0 }}>🚪</span>
            {sidebarOpen && <span>خروج</span>}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
        <div style={{ background:"#080b14", borderBottom:"1px solid var(--border)", padding:"0 20px", height:"64px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", position:"sticky", top:0, zIndex:40 }}>
          <h2 style={{ color:"var(--text)", fontSize:"15px", fontWeight:"700", margin:0 }}>
            {navItems.find(n=>n.key===tab)?.icon} {navItems.find(n=>n.key===tab)?.label}
          </h2>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            {pendingCount>0 && (
              <div onClick={()=>setTab("notifications")} style={{ display:"flex", alignItems:"center", gap:"6px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"99px", padding:"5px 12px", cursor:"pointer", animation:"goldGlow 2s ease-in-out infinite" }}>
                <span style={{ fontSize:"14px" }}>🔔</span>
                <span style={{ color:"#ef4444", fontSize:"12px", fontWeight:"700" }}>{pendingCount} طلب جديد</span>
              </div>
            )}
            <div style={{ background:"var(--gold-dim)", border:"1px solid var(--gold-border)", borderRadius:"99px", padding:"5px 12px", display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ fontSize:"12px" }}>👑</span>
              <span style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"700" }}>أدمن</span>
            </div>
          </div>
        </div>

        <div style={{ flex:1, padding:"24px 20px", maxWidth:"1000px", width:"100%", margin:"0 auto" }}>

          {/* ── Stats ── */}
          {tab==="stats" && (
            <div className="animate-fadeIn">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:"14px", marginBottom:"24px" }}>
                {[
                  {label:"إجمالي الطلبات",  val:orders.length,               icon:"📋", c:"#3b82f6"},
                  {label:"بانتظار المراجعة",val:pendingCount,                 icon:"⏳", c:"#f59e0b"},
                  {label:"تم التسليم",       val:doneCount,                    icon:"✅", c:"#22c55e"},
                  {label:"إيرادات اليوم",   val:todayRevenue.toFixed(3)+" BD",icon:"📅", c:"#a78bfa"},
                  {label:"إجمالي الإيرادات",val:totalRevenue.toFixed(3)+" BD",icon:"💰", c:"#D4AF37"},
                ].map(s=>(
                  <div key={s.label} className="card" style={{ textAlign:"center", border:`1px solid ${s.c}22` }}>
                    <div style={{ fontSize:"26px", marginBottom:"6px" }}>{s.icon}</div>
                    <div style={{ color:s.c, fontSize:"20px", fontWeight:"900", lineHeight:1.2 }}>{s.val}</div>
                    <div style={{ color:"var(--text-muted)", fontSize:"11px", marginTop:"4px" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {(() => {
                const map: Record<string,{name:string;qty:number;revenue:number}> = {};
                orders.filter(o=>o.status!=="rejected").forEach(o=>(o.items||[]).forEach((item:any)=>{
                  if (!map[item.name]) map[item.name]={name:item.name,qty:0,revenue:0};
                  map[item.name].qty+=(item.quantity||0); map[item.name].revenue+=(item.price||0)*(item.quantity||0);
                }));
                const top = Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,6);
                if (!top.length) return null;
                return (
                  <div className="card">
                    <p className="section-title">🏆 أكثر المنتجات مبيعاً</p>
                    {top.map((p,i)=>(
                      <div key={p.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<top.length-1?"1px solid var(--border)":"none" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                          <span style={{ background:"var(--gold-dim)", color:"var(--gold)", borderRadius:"50%", width:"22px", height:"22px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"800" }}>{i+1}</span>
                          <span style={{ color:"var(--text-dim)", fontSize:"13px" }}>{p.name}</span>
                        </div>
                        <div style={{ display:"flex", gap:"12px" }}>
                          <span style={{ color:"var(--gold)", fontWeight:"700", fontSize:"13px" }}>{p.qty} قطعة</span>
                          <span style={{ color:"var(--text-muted)", fontSize:"12px" }}>{p.revenue.toFixed(3)} BD</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {tab==="products"      && <div className="animate-fadeIn"><ManageProducts /></div>}
          {tab==="customers"     && <div className="animate-fadeIn"><Customers /></div>}
          {tab==="notifications" && <div className="animate-fadeIn"><Notifications /></div>}
          {tab==="telegram"      && <div className="animate-fadeIn"><TelegramSettings /></div>}
          {tab==="store"         && <div className="animate-fadeIn"><StoreSettings /></div>}

          {/* ── Orders ── */}
          {tab==="orders" && (
            <div className="animate-fadeIn">
              <div style={{ display:"flex", gap:"10px", marginBottom:"14px", flexWrap:"wrap" }}>
                <input className="inp" placeholder="🔍 بحث برقم الطلب أو الاسم أو الهاتف..."
                  value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} style={{ flex:1, minWidth:"180px" }} />
                <button onClick={exportCSV}
                  style={{ padding:"10px 14px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:"var(--radius-sm)", color:"#22c55e", cursor:"pointer", fontSize:"12px", fontWeight:"700", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                  📤 تصدير CSV
                </button>
              </div>

              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
                {["all","pending","confirmed","on_the_way","delivered","collected","rejected"].map(f=>(
                  <button key={f} onClick={()=>setFilter(f)}
                    style={{ padding:"5px 12px", borderRadius:"99px", border:"1px solid var(--border)", background:filter===f?"var(--gold)":"transparent", color:filter===f?"#000":"var(--text-muted)", cursor:"pointer", fontSize:"11px", fontWeight:filter===f?"700":"400", fontFamily:"inherit", transition:"var(--transition)" }}>
                    {f==="all"?"الكل":`${statusIcons[f]} ${statusLabels[f]}`}
                    {f!=="all" && <span style={{ marginRight:"4px", opacity:0.6 }}>({orders.filter(o=>o.status===f).length})</span>}
                  </button>
                ))}
              </div>

              {loading && (
                <div style={{ textAlign:"center", padding:"60px" }}>
                  <div className="animate-spin" style={{ width:"36px", height:"36px", border:"3px solid var(--border)", borderTop:"3px solid var(--gold)", borderRadius:"50%", margin:"0 auto 12px" }} />
                  <p style={{ color:"var(--text-muted)" }}>جاري التحميل...</p>
                </div>
              )}
              {!loading && filtered.length===0 && <p style={{ color:"var(--text-muted)", textAlign:"center", padding:"60px" }}>لا توجد طلبات 📭</p>}

              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                {filtered.map((order,i) => {
                  const customer = order.customer||{};
                  const items    = order.items||[];
                  const isDel    = order.deliveryType==="delivery";
                  const steps    = isDel ? deliverySteps : pickupSteps;
                  const curIdx   = steps.indexOf(order.status);
                  const c        = statusColors[order.status]||"#888";

                  return (
                    <div key={order.id} className="animate-slideUp card" style={{ animationDelay:`${i*0.03}s`, padding:0, overflow:"hidden", border:`1px solid ${order.status==="pending"?"rgba(245,158,11,0.3)":"var(--border)"}` }}>
                      <div style={{ padding:"16px 18px", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"10px", background:order.status==="pending"?"rgba(245,158,11,0.04)":"transparent" }}>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                            <span style={{ color:"var(--gold)", fontWeight:"800", fontSize:"14px" }}>#{order.orderNumber}</span>
                            <span style={{ background:c+"22", color:c, padding:"2px 10px", borderRadius:"99px", fontSize:"10px", border:`1px solid ${c}33`, fontWeight:"700" }}>
                              {statusIcons[order.status]} {statusLabels[order.status]}
                            </span>
                            {order.status==="pending" && (
                              <span style={{ background:"rgba(245,158,11,0.15)", color:"#f59e0b", padding:"2px 8px", borderRadius:"99px", fontSize:"10px", border:"1px solid rgba(245,158,11,0.3)", fontWeight:"700" }}>
                                🔔 يحتاج مراجعة
                              </span>
                            )}
                          </div>
                          <p style={{ color:"var(--text-muted)", fontSize:"11px", marginTop:"4px", margin:"4px 0 0" }}>
                            {order.createdAt?.toDate?.()?.toLocaleString("ar-BH")||"—"}
                          </p>
                        </div>
                        <div style={{ textAlign:"left" }}>
                          <div style={{ color:"var(--gold)", fontWeight:"900", fontSize:"18px" }}>{(order.total||0).toFixed(3)} BD</div>
                          <div style={{ color:"var(--text-muted)", fontSize:"11px" }}>{isDel?"🚗 توصيل":"🤝 استلام"}</div>
                        </div>
                      </div>

                      <div style={{ padding:"10px 18px", background:"rgba(0,0,0,0.2)", borderTop:"1px solid var(--border)", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:"6px", fontSize:"12px" }}>
                        <span style={{ color:"var(--text-dim)" }}>👤 {customer.name||"—"}</span>
                        <a href={`tel:${customer.phone}`} style={{ color:"#3b82f6", textDecoration:"none" }}>📞 {customer.phone||"—"}</a>
                        {customer.address && <span style={{ color:"var(--text-dim)" }}>📍 {customer.address}</span>}
                        <span style={{ color:"var(--text-dim)" }}>💳 {order.paymentMethod==="benefit"?"بنفت":order.paymentMethod==="balance"?"رصيد":"كاش"}</span>
                        {order.hasReceipt && (
                          <span style={{ color:"#22c55e", fontSize:"12px", display:"flex", alignItems:"center", gap:"4px" }}>
                            🧾 إيصال الدفع أُرسل للتلجرام ✅
                          </span>
                        )}
                      </div>

                      <div style={{ padding:"10px 18px", borderTop:"1px solid var(--border)" }}>
                        {items.map((item:any,j:number)=>(
                          <div key={j} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            {item.image && <img src={item.image} loading="lazy" decoding="async" alt="" style={{ width:"34px",height:"34px",objectFit:"cover",borderRadius:"6px",flexShrink:0 }} />}
                            <span style={{ flex:1, color:"var(--text-dim)", fontSize:"12px" }}>{item.name}{item.selectedSize&&` (م${item.selectedSize})`} × {item.quantity}</span>
                            <span style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"700" }}>{(item.price*item.quantity).toFixed(3)} BD</span>
                          </div>
                        ))}
                        {order.deliveryFee>0 && (
                          <div style={{ display:"flex", justifyContent:"space-between", color:"var(--text-muted)", fontSize:"12px", padding:"4px 0" }}>
                            <span>🚗 رسوم توصيل</span><span>{(order.deliveryFee).toFixed(3)} BD</span>
                          </div>
                        )}
                      </div>

                      {order.status!=="rejected" && (
                        <div style={{ padding:"10px 18px", borderTop:"1px solid var(--border)", display:"flex", gap:"4px", overflowX:"auto" }}>
                          {steps.map((step,idx)=>(
                            <div key={step} onClick={()=>updateStatus(order.id,step as OrderStatus)}
                              style={{ flex:1, minWidth:"60px", textAlign:"center", padding:"6px 4px", borderRadius:"8px",
                                background:idx<=curIdx?"rgba(212,175,55,0.1)":"transparent",
                                border:`1px solid ${idx<=curIdx?"var(--gold-border)":"var(--border)"}`,
                                color:idx<=curIdx?"var(--gold)":"var(--text-muted)",
                                fontSize:"10px", cursor:"pointer", whiteSpace:"nowrap", transition:"var(--transition)", fontWeight:idx===curIdx?"700":"400" }}>
                              {statusIcons[step]} {statusLabels[step]}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ padding:"10px 18px", borderTop:"1px solid var(--border)", display:"flex", gap:"6px", flexWrap:"wrap" }}>
                        {order.status==="pending" && <>
                          <button onClick={()=>updateStatus(order.id,"confirmed")} style={ab("#22c55e")}>✅ قبول</button>
                          <button onClick={()=>updateStatus(order.id,"rejected")}  style={ab("#ef4444")}>❌ رفض</button>
                        </>}
                        {order.status==="rejected" && (
                          <button onClick={()=>updateStatus(order.id,"pending")} style={ab("#f59e0b")}>↩️ استرجاع الطلب</button>
                        )}
                        {order.status==="confirmed"  && isDel  && <button onClick={()=>updateStatus(order.id,"on_the_way")} style={ab("#3b82f6")}>🚗 خرج للتوصيل</button>}
                        {order.status==="on_the_way"            && <button onClick={()=>updateStatus(order.id,"delivered")}  style={ab("#8b5cf6")}>📦 تم التوصيل</button>}
                        {order.status==="confirmed"  && !isDel  && <button onClick={()=>updateStatus(order.id,"collected")}  style={ab("#8b5cf6")}>🤝 تم الاستلام</button>}
                        <a href={`https://wa.me/${customer.phone}`} target="_blank" rel="noreferrer"
                          style={{...ab("#25D366"),textDecoration:"none"}}>💬 واتساب</a>
                        <button onClick={()=>deleteOrder(order.id)} style={{...ab("#ef4444"),marginRight:"auto"}}>🗑️ حذف</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ab = (c:string):React.CSSProperties=>({
  padding:"6px 13px", borderRadius:"8px", cursor:"pointer",
  fontSize:"11px", fontWeight:"700", background:c+"18",
  color:c, border:`1px solid ${c}33`, fontFamily:"inherit",
});
