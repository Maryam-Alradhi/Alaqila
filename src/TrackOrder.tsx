import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";

const deliverySteps = [
  { key:"pending",    label:"تم تقديم الطلب", icon:"📋" },
  { key:"confirmed",  label:"تم التأكيد",      icon:"✅" },
  { key:"on_the_way", label:"في الطريق",       icon:"🚗" },
  { key:"delivered",  label:"تم التوصيل",      icon:"📦" },
];
const pickupSteps = [
  { key:"pending",   label:"تم تقديم الطلب", icon:"📋" },
  { key:"confirmed", label:"تم التأكيد",      icon:"✅" },
  { key:"collected", label:"تم الاستلام",     icon:"🤝" },
];
const statusColors: Record<string,string> = {
  pending:"#f59e0b", confirmed:"#22c55e", on_the_way:"#3b82f6",
  delivered:"#8b5cf6", collected:"#8b5cf6", rejected:"#ef4444",
};

// ── شرح عام لمراحل الطلب — يظهر بس بالحالة الأولية قبل أي بحث ──
const explainerSteps = [
  { icon:"✅", label:"تم استلام الطلب" },
  { icon:"🚚", label:"قيد التجهيز" },
  { icon:"📦", label:"تم الشحن" },
  { icon:"📝", label:"تم التسليم" },
];
const trustFeatures = [
  { icon:"🎧", title:"دعم على مدار الساعة", desc:"فريق الدعم جاهز لمساعدتك 24/7" },
  { icon:"🔒", title:"دفع آمن",              desc:"جميع عمليات الدفع مشفرة 100%" },
  { icon:"🚚", title:"شحن سريع",             desc:"توصيل طلبك بسرعة في جميع أنحاء البحرين" },
  { icon:"💎", title:"جودة مضمونة",          desc:"ضمان على جميع المنتجات" },
];

function TrackOrder() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [order,      setOrder]      = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [searchVal,  setSearchVal]  = useState(orderNumber || "");
  const [cancelling, setCancelling] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [searched,   setSearched]   = useState(!!orderNumber);

  const fetchOrder = async (num: string) => {
    if (!num.trim()) return;
    setSearched(true);
    setLoading(true); setNotFound(false); setOrder(null); setShowInvoice(false);
    try {
      // ✅ جلب مباشر بمعرّف الطلب (مو استعلام) — يمنع أي شخص من سرد كل الطلبات
      const snap = await getDoc(doc(db,"orders",num.trim().toUpperCase()));
      if (snap.exists()) {
        const orderData: any = { id:snap.id, ...snap.data() };
        setOrder(orderData);
        // Auto-show invoice when completed
        const isDone = orderData.status === "delivered" || orderData.status === "collected";
        if (isDone) setShowInvoice(true);
      } else setNotFound(true);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (orderNumber) fetchOrder(orderNumber);
    else setLoading(false);
  }, [orderNumber]);

  const handleCancel = async () => {
    if (!order || order.status !== "pending") return;
    if (!window.confirm("هل أنت متأكد من إلغاء الطلب؟")) return;
    setCancelling(true);
    try {
      // ✅ الكمية ما تُخصم من المخزون إلا وقت ما الأدمن يؤكد الطلب، فطلب لسا "قيد المراجعة" ما يحتاج إرجاع كمية
      await updateDoc(doc(db,"orders",order.id), { status: "rejected" });
      setOrder({ ...order, status: "rejected" });
      showToast("تم إلغاء الطلب ✅", "info");
    } catch {
      showToast("فشل الإلغاء، حاول مجدداً ❌", "error");
    } finally {
      setCancelling(false);
    }
  };

  const steps = order?.deliveryType === "pickup" ? pickupSteps : deliverySteps;
  const currentIdx = order ? steps.findIndex(s => s.key === order.status) : -1;
  const isDone = order?.status === "delivered" || order?.status === "collected";
  const canCancel = order?.status === "pending";
  const isIdle = !searched && !loading && !order && !notFound;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", direction:"rtl" }}>

      {/* Hero */}
      <div style={{
        position:"relative", overflow:"hidden", textAlign:"center",
        padding:"70px 20px 50px",
        background:"radial-gradient(ellipse at 50% 0%, rgba(184,150,46,0.12) 0%, transparent 65%)",
        borderBottom:"1px solid var(--border)",
      }}>
        <span style={{ position:"absolute", top:"20%", left:"12%", color:"var(--gold)", fontSize:"18px", opacity:0.5 }}>✦</span>
        <span style={{ position:"absolute", top:"65%", right:"10%", color:"var(--gold)", fontSize:"14px", opacity:0.4 }}>✦</span>

        <div className="icon-badge-3d animate-glow" style={{
          width:"76px", height:"76px", borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"32px", margin:"0 auto 20px",
        }}>
          📦
        </div>
        <h1 className="font-display gold-shimmer" style={{ fontSize:"clamp(26px,5vw,38px)", margin:"0 0 10px", fontWeight:"700" }}>
          تتبع طلبك
        </h1>
        <p style={{ color:"var(--text-muted)", fontSize:"14px", marginBottom:"30px" }}>
          تابع حالة طلبك في كل خطوة حتى وصوله إليك
        </p>

        {/* Search */}
        <div style={{ display:"flex", gap:"10px", maxWidth:"460px", margin:"0 auto" }}>
          <div style={{ position:"relative", flex:1 }}>
            <span style={{ position:"absolute", top:"50%", left:"14px", transform:"translateY(-50%)", fontSize:"15px", opacity:0.6 }}>🔖</span>
            <input
              placeholder="أدخل رقم الطلب (AQ-XXXXXX)"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key==="Enter" && fetchOrder(searchVal)}
              className="inp"
              dir="ltr"
              style={{ paddingLeft:"38px" }}
            />
          </div>
          <button onClick={() => fetchOrder(searchVal)} className="btn-gold btn-3d" style={{ padding:"12px 22px", whiteSpace:"nowrap" }}>
            بحث
          </button>
        </div>

        <button onClick={() => navigate("/shop")} className="btn-ghost btn-3d" style={{ marginTop:"16px", padding:"11px 24px" }}>
          ← العودة للمتجر
        </button>
      </div>

      {/* Idle explainer — process steps + trust features */}
      {isIdle && (
        <>
          <div style={{ padding:"56px 20px 0", maxWidth:"920px", margin:"0 auto" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", gap:"0", flexWrap:"wrap" }}>
              {explainerSteps.map((step, idx) => (
                <div key={step.label} style={{ display:"flex", alignItems:"flex-start", flex:"1 1 120px", minWidth:"110px" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
                    <div className="icon-badge-3d" style={{ width:"52px", height:"52px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", animationDelay:`${idx*0.3}s` }}>
                      {step.icon}
                    </div>
                    <p style={{ color:"var(--text-dim)", fontSize:"13px", fontWeight:"600", marginTop:"12px", textAlign:"center" }}>{step.label}</p>
                  </div>
                  {idx < explainerSteps.length-1 && (
                    <div style={{ flex:"0 0 auto", width:"100%", maxWidth:"60px", height:"2px", marginTop:"25px", background:"repeating-linear-gradient(90deg, var(--gold-border) 0 6px, transparent 6px 12px)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:"56px 20px 70px", maxWidth:"1100px", margin:"0 auto" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"18px" }}>
              {trustFeatures.map(({ icon, title, desc }) => (
                <div key={title} className="card" style={{ textAlign:"center" }}>
                  <div className="icon-badge-3d" style={{ width:"48px", height:"48px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", margin:"0 auto 14px" }}>
                    {icon}
                  </div>
                  <h3 style={{ color:"var(--gold)", fontSize:"14px", margin:"0 0 6px", fontWeight:"700" }}>{title}</h3>
                  <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:0, lineHeight:"1.7" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Results */}
      <div style={{ maxWidth:"520px", margin:"0 auto", padding: isIdle ? "0 16px" : "40px 16px" }}>

        {loading && (
          <div style={{ textAlign:"center", padding:"40px" }}>
            <div className="animate-spin" style={{ width:"36px", height:"36px", border:"3px solid var(--border)", borderTop:"3px solid var(--gold)", borderRadius:"50%", margin:"0 auto 12px" }} />
            <p style={{ color:"var(--text-muted)" }}>جاري البحث...</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="card animate-slideUp" style={{ textAlign:"center", padding:"36px" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>🔍</div>
            <p style={{ color:"#ef4444", fontSize:"16px", fontWeight:"700" }}>لم يتم العثور على الطلب</p>
            <p style={{ color:"var(--text-muted)", fontSize:"13px", marginTop:"6px" }}>تأكد من رقم الطلب وحاول مجدداً</p>
          </div>
        )}

        {order && (
          <div className="animate-fadeIn" style={{ display:"flex", flexDirection:"column", gap:"14px" }}>

            {/* Status header */}
            <div className="card" style={{ padding:"20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" }}>
                <div>
                  <p style={{ color:"var(--gold)", fontWeight:"800", fontSize:"20px", margin:0 }}>#{order.orderNumber}</p>
                  <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:"4px 0 0" }}>
                    {order.createdAt?.toDate?.()?.toLocaleString("ar-BH") || "—"}
                  </p>
                </div>
                <span style={{ background:statusColors[order.status]+"22", color:statusColors[order.status], padding:"6px 14px", borderRadius:"20px", fontSize:"13px", border:`1px solid ${statusColors[order.status]}44`, fontWeight:"700" }}>
                  {steps.find(s=>s.key===order.status)?.icon || "❌"} {steps.find(s=>s.key===order.status)?.label || "مرفوض"}
                </span>
              </div>
            </div>

            {/* Rejection */}
            {order.status==="rejected" && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"var(--radius)", padding:"16px", color:"#ef4444", fontSize:"13px", lineHeight:1.6 }}>
                ⚠️ تم رفض/إلغاء الطلب. يرجى التواصل معنا عبر واتساب لمعرفة التفاصيل.
              </div>
            )}

            {/* Loyalty badge on completion */}
            {isDone && order.loyaltyAwarded && (
              <div style={{ background:"linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.04))", border:"1px solid var(--gold-border)", borderRadius:"var(--radius)", padding:"16px", display:"flex", gap:"14px", alignItems:"center" }}>
                <div style={{ fontSize:"32px" }}>🎁</div>
                <div>
                  <p style={{ color:"var(--gold)", fontWeight:"800", fontSize:"14px", margin:0 }}>تم إضافة مكافأة لرصيدك!</p>
                  <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:"4px 0 0" }}>
                    حصلت على <span style={{ color:"#22c55e", fontWeight:"700" }}>{Number(order.loyaltyAmount||0).toFixed(3)} BD</span> رصيد مكافأة 🎉
                  </p>
                </div>
              </div>
            )}

            {/* ✅ INVOICE on completion */}
            {isDone && (
              <div>
                <button onClick={() => setShowInvoice(!showInvoice)}
                  style={{ width:"100%", padding:"12px 16px", background:"var(--gold-dim)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius)", color:"var(--gold)", cursor:"pointer", fontSize:"14px", fontWeight:"700", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                  🧾 {showInvoice ? "إخفاء الفاتورة" : "عرض الفاتورة"}
                </button>

                {showInvoice && (
                  <div className="animate-fadeIn card" style={{ marginTop:"10px", padding:"20px", border:"1px solid var(--gold-border)" }}>
                    {/* Invoice header */}
                    <div style={{ textAlign:"center", borderBottom:"1px solid var(--border)", paddingBottom:"14px", marginBottom:"14px" }}>
                      <div style={{ fontSize:"28px", marginBottom:"4px" }}>💍</div>
                      <h2 style={{ color:"var(--gold)", fontSize:"18px", fontWeight:"900", margin:0 }}>العقيلة</h2>
                      <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"4px 0 0" }}>فاتورة رسمية</p>
                    </div>

                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"var(--text-muted)", marginBottom:"4px" }}>
                      <span>رقم الطلب</span>
                      <span style={{ color:"var(--gold)", fontWeight:"700", fontFamily:"monospace" }}>#{order.orderNumber}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"var(--text-muted)", marginBottom:"14px" }}>
                      <span>التاريخ</span>
                      <span>{order.createdAt?.toDate?.()?.toLocaleDateString("ar-BH") || "—"}</span>
                    </div>

                    {/* Customer */}
                    <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:"8px", padding:"10px 12px", marginBottom:"14px", fontSize:"12px" }}>
                      <p style={{ color:"var(--text-muted)", margin:"0 0 4px", fontSize:"10px", fontWeight:"700", textTransform:"uppercase" }}>العميل</p>
                      <p style={{ color:"var(--text)", margin:"0 0 2px" }}>👤 {order.customer?.name || "—"}</p>
                      <p style={{ color:"var(--text-muted)", margin:0 }}>📞 {order.customer?.phone || "—"}</p>
                      {order.deliveryType === "delivery" && order.customer?.address && (
                        <p style={{ color:"var(--text-muted)", margin:"2px 0 0" }}>📍 {order.customer.address}</p>
                      )}
                    </div>

                    {/* Items */}
                    <p style={{ color:"var(--text-muted)", fontSize:"11px", fontWeight:"700", margin:"0 0 8px" }}>المنتجات</p>
                    {(order.items || []).map((item: any, i: number) => (
                      <div key={i} style={{ padding:"7px 0", borderBottom:"1px solid var(--border)" }}>
                        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                          {item.image && <img src={item.image} alt="" style={{ width:"32px", height:"32px", objectFit:"cover", borderRadius:"6px", flexShrink:0 }} />}
                          <span style={{ flex:1, color:"var(--text-dim)", fontSize:"12px" }}>{item.name}{item.selectedSize && ` (م${item.selectedSize})`}</span>
                          <span style={{ color:"var(--text-muted)", fontSize:"11px" }}>×{item.quantity}</span>
                          <span style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"700" }}>{(item.price * item.quantity).toFixed(3)} BD</span>
                        </div>
                        {Array.isArray(item.customization) && item.customization.length > 0 && (
                          <div style={{ marginTop:"6px", marginRight:"40px" }}>
                            {item.customization.map((c:any,ci:number)=>(
                              <p key={ci} style={{ color:"var(--gold)", fontSize:"11px", margin:0 }}>🎨 {c.label}: <span style={{ color:"var(--text-muted)" }}>{c.value}</span></p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Totals */}
                    <div style={{ marginTop:"12px", display:"flex", flexDirection:"column", gap:"4px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"var(--text-muted)" }}>
                        <span>المجموع الفرعي</span>
                        <span>{(order.subtotal || 0).toFixed(3)} BD</span>
                      </div>
                      {order.deliveryFee > 0 && (
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"var(--text-muted)" }}>
                          <span>🚗 رسوم التوصيل</span>
                          <span>{order.deliveryFee.toFixed(3)} BD</span>
                        </div>
                      )}
                      {order.balanceDiscount > 0 && (
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#22c55e" }}>
                          <span>💰 خصم الرصيد</span>
                          <span>-{order.balanceDiscount.toFixed(3)} BD</span>
                        </div>
                      )}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"16px", fontWeight:"900", borderTop:"1px solid var(--border)", paddingTop:"10px", marginTop:"4px" }}>
                        <span style={{ color:"var(--text)" }}>الإجمالي</span>
                        <span style={{ color:"var(--gold)" }}>{(order.total || 0).toFixed(3)} BD</span>
                      </div>
                    </div>

                    {/* Payment method */}
                    <div style={{ marginTop:"12px", background:"rgba(0,0,0,0.2)", borderRadius:"8px", padding:"8px 12px", display:"flex", justifyContent:"space-between", fontSize:"12px" }}>
                      <span style={{ color:"var(--text-muted)" }}>طريقة الدفع</span>
                      <span style={{ color:"var(--text)", fontWeight:"700" }}>
                        {order.paymentMethod === "cod" ? "💵 كاش" : order.paymentMethod === "benefit" ? "💳 Benefit" : "💰 رصيد"}
                      </span>
                    </div>

                    <div style={{ textAlign:"center", marginTop:"16px", paddingTop:"12px", borderTop:"1px solid var(--border)" }}>
                      <p style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"700", margin:0 }}>شكراً لتسوقك معنا ✨</p>
                      <p style={{ color:"var(--text-muted)", fontSize:"10px", margin:"4px 0 0" }}>العقيلة للمجوهرات</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress steps */}
            {order.status!=="rejected" && (
              <div className="card" style={{ padding:"20px" }}>
                <p className="section-title">مراحل الطلب</p>
                {steps.map((step, idx) => {
                  const done    = idx < currentIdx;
                  const current = idx === currentIdx;
                  const future  = idx > currentIdx;
                  return (
                    <div key={step.key} style={{ display:"flex", alignItems:"flex-start", gap:"14px" }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                        <div style={{
                          width:"38px", height:"38px", borderRadius:"50%",
                          background:done?"var(--gold)":current?"var(--gold)":"transparent",
                          border:`2px solid ${done||current?"var(--gold)":"var(--border)"}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"16px", color:done||current?"#000":"var(--text-muted)",
                          boxShadow:current?"0 0 16px rgba(212,175,55,0.5)":"none",
                          transition:"0.3s",
                        }}>
                          {done ? "✓" : step.icon}
                        </div>
                        {idx < steps.length-1 && (
                          <div style={{ width:"2px", height:"30px", background:done?"var(--gold)":"var(--border)", transition:"0.3s" }} />
                        )}
                      </div>
                      <div style={{ paddingTop:"8px", paddingBottom:idx<steps.length-1?"20px":"0" }}>
                        <p style={{ margin:0, color:future?"var(--text-muted)":"var(--text)", fontWeight:current?"700":"400", fontSize:"14px" }}>
                          {step.label}
                        </p>
                        {current && (
                          <p style={{ color:"var(--gold)", fontSize:"11px", margin:"2px 0 0", fontWeight:"600" }}>← الحالة الحالية</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Order summary */}
            <div className="card" style={{ padding:"18px" }}>
              <p className="section-title">تفاصيل الطلب</p>
              {(order.items||[]).map((item:any, i:number) => (
                <div key={i} style={{ padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ color:"var(--text-dim)", fontSize:"13px" }}>
                      {item.name}{item.selectedSize&&` (م${item.selectedSize})`} × {item.quantity}
                    </span>
                    <span style={{ color:"var(--gold)", fontSize:"13px", fontWeight:"700" }}>{(item.price*item.quantity).toFixed(3)} BD</span>
                  </div>
                  {Array.isArray(item.customization) && item.customization.length > 0 && (
                    <div style={{ marginTop:"4px" }}>
                      {item.customization.map((c:any,ci:number)=>(
                        <p key={ci} style={{ color:"var(--gold)", fontSize:"11px", margin:0 }}>🎨 {c.label}: <span style={{ color:"var(--text-muted)" }}>{c.value}</span></p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {order.deliveryFee>0 && (
                <div style={{ display:"flex", justifyContent:"space-between", color:"var(--text-muted)", fontSize:"12px", padding:"5px 0" }}>
                  <span>🚗 رسوم التوصيل</span>
                  <span>{order.deliveryFee.toFixed(3)} BD</span>
                </div>
              )}
              {order.balanceDiscount>0 && (
                <div style={{ display:"flex", justifyContent:"space-between", color:"#22c55e", fontSize:"12px", padding:"5px 0" }}>
                  <span>💰 خصم الرصيد</span>
                  <span>-{order.balanceDiscount.toFixed(3)} BD</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", color:"var(--text)", fontWeight:"800", fontSize:"16px", borderTop:"1px solid var(--border)", paddingTop:"10px", marginTop:"4px" }}>
                <span>الإجمالي</span>
                <span style={{ color:"var(--gold)" }}>{(order.total||0).toFixed(3)} BD</span>
              </div>
            </div>

            {order.deliveryType==="pickup" && order.status==="confirmed" && (
              <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"var(--radius-sm)", padding:"12px 14px", color:"#f59e0b", fontSize:"13px" }}>
                📞 سيتواصل معك البائع قريباً لتحديد وقت الاستلام
              </div>
            )}

            {/* ✅ CANCEL BUTTON - only when pending */}
            {canCancel && (
              <button onClick={handleCancel} disabled={cancelling}
                style={{ width:"100%", padding:"12px 16px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.35)", borderRadius:"var(--radius)", color:"#ef4444", cursor:cancelling?"not-allowed":"pointer", fontSize:"14px", fontWeight:"700", fontFamily:"inherit", opacity:cancelling?0.6:1 }}>
                {cancelling ? "⏳ جاري الإلغاء..." : "❌ إلغاء الطلب"}
              </button>
            )}

            {/* Show message if confirmed+ that cancellation is not possible */}
            {order.status !== "pending" && order.status !== "rejected" && !isDone && (
              <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"var(--radius-sm)", padding:"10px 14px", color:"#f59e0b", fontSize:"12px", textAlign:"center" }}>
                🔒 لا يمكن إلغاء الطلب بعد قبوله
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default TrackOrder;
