import { useState, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CartContext } from "./CartContext";
import { setDoc, updateDoc, serverTimestamp, doc, getDoc, increment, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import AuthGateModal from "./AuthGateModal";
import fastDeliveryIcon from "./assets/icons/fast-delivery.png";
import qualityIcon from "./assets/icons/quality.png";
import customerServiceIcon from "./assets/icons/customer-service.png";
import securePaymentIcon from "./assets/icons/secure-payment.png";

function checkRateLimit(): boolean {
  const key = "order_times"; const now = Date.now(); const win = 10*60*1000;
  const stored: number[] = JSON.parse(localStorage.getItem(key)||"[]");
  const recent = stored.filter(t=>now-t<win);
  if (recent.length>=3) return false;
  recent.push(now); localStorage.setItem(key,JSON.stringify(recent)); return true;
}

function generateOrderNumber(): string {
  const arr = new Uint8Array(6); crypto.getRandomValues(arr);
  return `AQ-${Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase()}`;
}

// ✅ إشعار فوري عبر ntfy — يُرسل مباشرة من المتصفح وقت تأكيد الطلب (بدون Cloud Function)
// اسم القناة مو سري بنفس درجة توكن بوت، فإرساله من المتصفح مباشرة آمن بما يكفي
async function sendNtfyNotification(topic: string, orderNumber: string, orderData: any, receiptFile: File | null) {
  if (!topic) return;
  try {
    const items: any[] = Array.isArray(orderData.items) ? orderData.items : [];
    const itemsList = items.map(item => {
      const price = Number(item.price || 0), qty = Number(item.quantity || 0);
      const custLines = Array.isArray(item.customization) && item.customization.length
        ? "\n" + item.customization.map((c: any) => `   🎨 ${c.label}: ${c.value}`).join("\n")
        : "";
      const variant = item.selectedSize || item.selectedNecklaceType;
      return `• ${item.name || ""}${variant ? ` (${variant})` : ""} × ${qty} — ${(price * qty).toFixed(3)} BD${custLines}`;
    }).join("\n");

    const isDelivery = orderData.deliveryType === "delivery";
    const delivLine = isDelivery
      ? `📍 العنوان: ${orderData.customer?.address || ""}\n🚗 توصيل: ${Number(orderData.deliveryFee || 0)} BD`
      : `🤝 الاستلام: شخصي`;
    const paymentLabel = orderData.paymentMethod === "cod" ? "كاش عند الاستلام" : orderData.paymentMethod === "benefit" ? "Benefit" : "رصيد";
    const codLine = orderData.paymentMethod === "cod" ? "\n⚠️ لم يتم الدفع بعد — يُدفع كاش عند الاستلام" : "";

    const message = `👤 الاسم: ${orderData.customer?.name || ""}\n📞 الهاتف: ${orderData.customer?.phone || ""}\n${delivLine}\n💳 الدفع: ${paymentLabel}${codLine}\n\n📦 المنتجات:\n${itemsList}\n\n💰 الإجمالي: ${Number(orderData.total || 0).toFixed(3)} BD`;

    await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: { "Title": `New Order - ${orderNumber}`, "Priority": "high", "Tags": "shopping_bags" },
      body: message,
    });

    if (receiptFile) {
      await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "PUT",
        headers: { "Filename": "receipt.jpg", "Title": `Receipt - ${orderNumber}` },
        body: receiptFile,
      });
    }
  } catch {
    // ✅ فشل الإشعار ما يوقف الطلب — الطلب نفسه محفوظ بقاعدة البيانات على أي حال
  }
}

const steps = [
  { n: 1, label: "معلومات العميل" },
  { n: 2, label: "موقع الاستلام" },
  { n: 3, label: "معلومات الدفع" },
  { n: 4, label: "ملخص الطلب" },
];

export default function Checkout() {
  const { cart, clearCart, coupon, clearCoupon } = useContext(CartContext);
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const topRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const [name,        setName]        = useState(profile?.name    || "");
  const [phone,       setPhone]       = useState(profile?.phone   || "");
  const [address,     setAddress]     = useState(profile?.address || "");
  const [notes,       setNotes]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [payment,     setPayment]     = useState<"cod"|"benefit"|"balance"|null>(null);   // ← null = لم يختر بعد
  const [delivery,    setDelivery]    = useState<"delivery"|"pickup"|null>(null);           // ← null = لم يختر بعد
  const [useBalance,  setUseBalance]  = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>({ deliveryFee:"2", loyaltyPercent:"5", loyaltyEnabled:true });
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ orderNumber: string } | null>(null);

  // إيصال الدفع
  const [receiptFile,    setReceiptFile]    = useState<File|null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string|null>(null);

  // scroll للأعلى عند فتح الصفحة
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  useEffect(() => {
    getDoc(doc(db,"settings","store")).then(snap => { if (snap.exists()) setStoreSettings(snap.data()); }).catch(()=>{});
    getDoc(doc(db,"settings","ntfy")).then(snap => { if (snap.exists()) setNtfyTopic(snap.data().topic || ""); }).catch(()=>{});
  }, []);

  const DELIVERY_FEE   = Number(storeSettings.deliveryFee ?? 2);
  const subtotal        = cart.reduce((s:number,i:any)=>s+(i.price||0)*(i.quantity||0),0);
  const delivFee         = delivery==="delivery" ? DELIVERY_FEE : 0;
  const couponDiscount   = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const balance          = profile?.balance || 0;
  const balanceDiscount  = useBalance ? Math.min(balance, Math.max(0, subtotal+delivFee-couponDiscount)) : 0;
  const total             = Math.max(0, subtotal+delivFee-couponDiscount-balanceDiscount);

  // ✅ الحد الأقصى 600KB — الإيصال يُحفظ base64 مؤقتاً داخل مستند الطلب بفايرستور،
  // وفايرستور له حد أقصى 1MB لحجم المستند الواحد، فلازم نضل تحته بهامش أمان
  const MAX_RECEIPT_BYTES = 600 * 1024;
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("اختر صورة فقط 🖼️","warning"); return; }
    if (file.size > MAX_RECEIPT_BYTES) { showToast("الحجم الأقصى 600KB — قصّر حجم الصورة وحاول مرة أخرى","warning"); return; }
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const validate = (): string|null => {
    if (!delivery)           return "اختر طريقة الاستلام";
    if (!payment)            return "اختر طريقة الدفع";
    if (!name.trim())        return "أدخل اسمك الكامل";
    if (!/^\d{7,12}$/.test(phone.replace(/\s/g,""))) return "رقم الهاتف غير صحيح";
    if (delivery==="delivery" && !address.trim()) return "أدخل العنوان";
    if (payment==="balance" && balance < total) return "رصيدك غير كافٍ للدفع الكامل";
    if (payment==="benefit" && !receiptFile)    return "يجب رفع صورة إيصال الدفع 🧾";
    return null;
  };

  const handleOrder = async () => {
    const err = validate();
    if (err) { showToast(err,"warning"); return; }
    if (cart.length===0) { showToast("السلة فارغة","warning"); return; }
    if (!checkRateLimit()) { showToast("انتظر قليلاً قبل إرسال طلب جديد ⏳","warning"); return; }

    try {
      setLoading(true);

      // فحص الكمية — بشكل آمن (المنتجات المصنوعة حسب الطلب ما تخضع لمخزون، نتجاوزها)
      try {
        for (const item of cart) {
          if (!item?.id || item.customizable) continue;
          const snap = await getDoc(doc(db,"products",item.id));
          if (!snap.exists()) continue;
          const data:any = snap.data()||{};
          const size = typeof item.selectedSize==="string" ? item.selectedSize : null;
          const avail = data.sizes&&size ? (data.sizes[size]||0) : (data.quantity||0);
          if (avail < (item.quantity||0)) {
            showToast(`"${item.name}" غير متوفر بالكمية المطلوبة ❌`,"error");
            setLoading(false); return;
          }
        }
      } catch { /* نكمل حتى لو فشل فحص الكمية */ }

      const hasReceipt = payment==="benefit" && !!receiptFile;
      const orderNumber = generateOrderNumber();

      // تنظيف الـ items قبل الحفظ — Firestore لا يقبل undefined أو قيم غير صالحة
      const cleanItems = cart.map((item: any) => ({
        id:           item.id           ?? "",
        name:         item.name         ?? "",
        price:        Number(item.price ?? 0),
        quantity:     Number(item.quantity ?? 1),
        image:        item.image        ?? "",
        selectedSize: item.selectedSize ?? null,
        selectedNecklaceType: item.selectedNecklaceType ?? null,
        customizable: !!item.customizable, // ✅ يحدد إذا المنتج مصنوع حسب الطلب — يعفيه من كل منطق المخزون
        customization: Array.isArray(item.customization)
          ? item.customization.map((c: any) => ({ label: String(c.label ?? ""), value: String(c.value ?? "") }))
          : null,
      }));

      // حفظ الطلب — نستخدم رقم الطلب نفسه كمعرّف المستند، عشان تتبع الطلب يصير بجلب مباشر (get) بدل استعلام (list)
      // وهذا يخلي قواعد الأمان تقدر تمنع أي شخص من عرض كل الطلبات دفعة وحدة
      const orderData = {
        orderNumber,
        userId:        user?.uid ?? null,
        customer: {
          name:    name.trim(),
          phone:   phone.trim(),
          address: address.trim(),
          email:   user?.email ?? null, // ✅ نحتاجه لاحقاً لإرسال إشعار بريدي عند تغيّر حالة الطلب
        },
        notes:         notes.trim(),
        items:         cleanItems,
        subtotal:      Number(subtotal)      || 0,
        deliveryFee:   Number(delivFee)      || 0,
        couponCode:    coupon?.code || null,
        couponDiscount: Number(couponDiscount) || 0,
        balanceDiscount: Number(balanceDiscount) || 0,
        total:         Number(total)         || 0,
        paymentMethod: payment    ?? "cod",
        deliveryType:  delivery   ?? "delivery",
        hasReceipt,
        status:        "pending",
        stockDeducted: true, // ✅ الكمية تُخصم فوراً وقت الطلب — تمنع بيع نفس القطعة لأكثر من زبون بنفس الوقت
        createdAt:     serverTimestamp(),
      };
      await setDoc(doc(db,"orders",orderNumber), orderData);

      // ✅ خصم الكمية فوراً من كل منتج بالسلة — best-effort، ما يوقف الطلب لو فشل بند وحد
      // وبعد الخصم، لو الكمية المتبقية وصلت 3 أو أقل، نرسل تنبيه ntfy للأدمن (نفس قناة إشعار الطلبات)
      // (المنتجات المصنوعة حسب الطلب ما تخضع لمخزون، نتجاوزها هنا)
      for (const item of cart) {
        if (!item?.id || item.customizable) continue;
        try {
          const ref = doc(db,"products",item.id);
          await updateDoc(ref, { quantity: increment(-(item.quantity||0)) });
          try {
            const snap = await getDoc(ref);
            const remaining = Number(snap.data()?.quantity ?? -1);
            if (ntfyTopic && remaining >= 0 && remaining <= 1) {
              fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic)}`, {
                method: "POST",
                headers: { "Title": "تنبيه مخزون منخفض", "Priority": "default", "Tags": "warning" },
                body: remaining === 0
                  ? `⚠️ "${item.name}" نفذ من المخزون بالكامل`
                  : `⚠️ "${item.name}" باقي منه ${remaining} فقط بالمخزون`,
              });
            }
          } catch { /* التنبيه اختياري، ما يوقف الطلب */ }
        } catch { /* نكمل حتى لو فشل خصم منتج معيّن */ }
      }

      // ✅ إشعار فوري مباشرة من المتصفح — نص الطلب + صورة الإيصال (إن وجدت)
      sendNtfyNotification(ntfyTopic, orderNumber, orderData, hasReceipt ? receiptFile : null);

      // خصم الرصيد — مسجلين فقط
      if (useBalance && balanceDiscount>0 && user) {
        try {
          await updateDoc(doc(db,"users",user.uid),{balance:increment(-balanceDiscount)});
          refreshProfile();
        } catch { /* ما نوقف الطلب لو فشل خصم الرصيد */ }
      }

      // ✅ نسجّل كود الخصم كمستخدم — يمنع نفس العميل يستخدمه مرة ثانية
      if (coupon && user) {
        try { await updateDoc(doc(db,"users",user.uid), { usedCoupons: arrayUnion(coupon.code) }); }
        catch { /* ما نوقف الطلب لو فشل التسجيل */ }
      }

      clearCart();
      clearCoupon();
      setSuccessInfo({ orderNumber });
    } catch(e) {
      console.error(e); showToast("حدث خطأ، حاول مرة أخرى 😢","error");
    } finally { setLoading(false); }
  };

  // ✅ نافذة نجاح الطلب — تظهر فوق أي شي، حتى لو السلة صارت فاضية بعد الإرسال
  if (successInfo) return createPortal(
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(10px)", zIndex:500 }} />
      <div style={{ position:"fixed", inset:0, zIndex:501, overflowY:"auto", padding:"40px 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div className="animate-scaleIn card" style={{ width:"100%", maxWidth:"420px", padding:"32px 26px", direction:"rtl", textAlign:"center", border:"1px solid var(--gold-border)", boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }}>
          <div style={{ fontSize:"44px", marginBottom:"14px" }}>🎉</div>
          <h2 className="font-display gold-shimmer" style={{ fontSize:"20px", fontWeight:"800", margin:"0 0 8px" }}>تم إرسال طلبك بنجاح!</h2>
          <p style={{ color:"var(--text-muted)", fontSize:"13px", marginBottom:"18px" }}>
            رقم طلبك: <span style={{ color:"var(--gold)", fontWeight:"700", fontFamily:"monospace" }}>#{successInfo.orderNumber}</span>
          </p>
          <div style={{ background:"rgba(212,175,55,0.06)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius)", padding:"14px 16px", marginBottom:"20px", textAlign:"right" }}>
            <p style={{ color:"var(--text-dim)", fontSize:"12px", margin:0, lineHeight:1.8 }}>
              📩 راح توصلك تحديثات حالة طلبك على بريدك الإلكتروني. لو ما شفتها بصندوق الوارد، تأكدي من مجلد <strong style={{ color:"var(--gold)" }}>السبام / البريد غير المرغوب فيه</strong>.
            </p>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={()=>navigate("/track/"+successInfo.orderNumber)} className="btn-gold btn-3d" style={{ flex:1, padding:"12px" }}>
              عرض تفاصيل طلبي
            </button>
            <button onClick={()=>navigate("/shop")} className="btn-ghost btn-3d" style={{ flex:1, padding:"12px" }}>
              متابعة التسوق
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );

  if (cart.length===0) return (
    <div style={{ textAlign:"center", marginTop:"80px", padding:"20px" }}>
      <div style={{ fontSize:"52px", marginBottom:"16px" }}>🛒</div>
      <h2 style={{ color:"var(--gold)" }}>السلة فارغة</h2>
      <button onClick={()=>navigate("/shop")} className="btn-gold" style={{ marginTop:"20px" }}>العودة للمتجر</button>
    </div>
  );

  // ✅ إتمام الطلب يحتاج تسجيل دخول — نعرض box فوق نفس الصفحة بدل ما ننقله لصفحة ثانية تلخبطه
  if (!authLoading && !user) return <AuthGateModal />;

  const BENEFIT_IBAN = storeSettings.iban || (import.meta.env.VITE_BENEFIT_IBAN as string);

  return (
    <div ref={topRef} style={{ padding:"32px 16px 60px", maxWidth:"1100px", margin:"0 auto", direction:"rtl" }}>
      <h1 className="font-display" style={{ color:"var(--gold)", textAlign:"center", marginBottom:"6px", fontSize:"24px", fontWeight:"800", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
        📝 إنشاء طلب جديد
      </h1>

      {/* Step indicator */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0", margin:"26px 0 34px", flexWrap:"wrap" }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
              <div style={{
                width:"34px", height:"34px", borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"13px", fontWeight:"800",
                background: s.n===1 ? "var(--gold)" : "transparent",
                color: s.n===1 ? "#000" : "var(--text-muted)",
                border:`2px solid ${s.n===1 ? "var(--gold)" : "var(--border)"}`,
                boxShadow: s.n===1 ? "0 0 16px rgba(212,175,55,0.4)" : "none",
              }}>
                {s.n}
              </div>
              <span style={{ color: s.n===1 ? "var(--gold)" : "var(--text-muted)", fontSize:"11px", fontWeight:s.n===1?"700":"400", whiteSpace:"nowrap" }}>{s.label}</span>
            </div>
            {i < steps.length-1 && <div style={{ width:"40px", height:"1px", background:"var(--border)", margin:"0 8px", marginBottom:"20px" }} />}
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"24px", alignItems:"start" }} className="checkout-grid">
        {/* ── Form column (right) ── */}
        <div>
          {/* معلومات العميل */}
          <Section title="معلومات العميل" icon="👤">
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute",top:"50%",right:"14px",transform:"translateY(-50%)" }}>👤</span>
                <input className="inp" placeholder="مثال: مريم أحمد" value={name} onChange={e=>setName(e.target.value)} style={{ paddingRight:"42px" }} />
              </div>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute",top:"50%",right:"14px",transform:"translateY(-50%)" }}>📞</span>
                <input className="inp" placeholder="مثال: 39991234" value={phone} onChange={e=>setPhone(e.target.value)} dir="ltr" style={{ paddingRight:"42px" }} />
              </div>
            </div>
          </Section>

          {/* موقع الاستلام */}
          <Section title="موقع الاستلام" icon="📍">
            <div style={{ display:"flex", gap:"10px", marginBottom:"10px" }}>
              {(["pickup","delivery"] as const).map(d=>(
                <button key={d} onClick={()=>setDelivery(d)} className="btn-3d"
                  style={{ flex:1, padding:"12px", borderRadius:"var(--radius)", border:`2px solid ${delivery===d?"var(--gold)":"var(--border)"}`, background:delivery===d?"var(--gold-dim)":"transparent", color:delivery===d?"var(--gold)":"var(--text-muted)", cursor:"pointer", fontWeight:"700", fontSize:"13px", fontFamily:"inherit" }}>
                  {d==="delivery"?`🚚 توصيل (${DELIVERY_FEE} BD)`:"🏪 استلام شخصي"}
                </button>
              ))}
            </div>
            {delivery===null && (
              <p style={{ color:"var(--amber)", fontSize:"12px", textAlign:"center", margin:0, opacity:0.7 }}>👆 اختر طريقة الاستلام</p>
            )}
            {delivery==="delivery" && (
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute",top:"14px",right:"14px" }}>📍</span>
                <textarea className="inp" placeholder="العنوان التفصيلي" value={address} onChange={e=>setAddress(e.target.value)} rows={2} style={{ paddingRight:"42px", resize:"vertical", display:"block", width:"100%", boxSizing:"border-box" }} />
              </div>
            )}
            {delivery==="pickup" && (
              <p style={{ color:"var(--amber)", fontSize:"12px", background:"rgba(245,158,11,0.06)", padding:"10px 12px", borderRadius:"8px", border:"1px solid rgba(245,158,11,0.2)", margin:0 }}>
                📞 سيتواصل معك البائع لتحديد وقت الاستلام
              </p>
            )}
          </Section>

          {/* معلومات الدفع */}
          <Section title="معلومات الدفع" icon="💳">
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"12px" }}>
              {(["cod","benefit","balance"] as const).map(p=>{
                const disabled = p==="balance" && balance<=0;
                return (
                  <button key={p} onClick={()=>!disabled&&setPayment(p)} disabled={disabled} className="btn-3d"
                    style={{ flex:1, minWidth:"90px", padding:"11px 8px", borderRadius:"var(--radius)", border:`2px solid ${payment===p?"var(--gold)":"var(--border)"}`, background:payment===p?"var(--gold-dim)":"transparent", color:disabled?"var(--text-muted)":payment===p?"var(--gold)":"var(--text-dim)", cursor:disabled?"not-allowed":"pointer", fontWeight:"700", fontSize:"12px", fontFamily:"inherit", opacity:disabled?0.5:1 }}>
                    {p==="cod"?"💵 الدفع عند الاستلام":p==="benefit"?"💳 Benefit":`💰 رصيد (${balance.toFixed(3)} BD)`}
                  </button>
                );
              })}
            </div>
            {payment===null && (
              <p style={{ color:"var(--amber)", fontSize:"12px", textAlign:"center", margin:0, opacity:0.7 }}>👆 اختر طريقة الدفع</p>
            )}

            {payment==="benefit" && (
              <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:"var(--radius)", padding:"16px", border:"1px solid var(--gold-border)", textAlign:"center" }}>
                <p style={{ color:"var(--gold)", fontWeight:"700", marginBottom:"10px", fontSize:"13px" }}>تحويل عبر Benefit</p>
                {BENEFIT_IBAN ? (
                  <>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=BenefitPay:${BENEFIT_IBAN}`} alt="QR" style={{ borderRadius:"10px", marginBottom:"10px", background:"white", padding:"6px" }} />
                    <p style={{ color:"var(--text-muted)", fontSize:"11px", marginBottom:"6px" }}>أو التحويل عبر IBAN:</p>
                    <p style={{ color:"white", fontSize:"12px", fontFamily:"monospace", background:"rgba(0,0,0,0.4)", padding:"8px 12px", borderRadius:"8px", userSelect:"all", wordBreak:"break-all" }}>{BENEFIT_IBAN}</p>
                  </>
                ) : (
                  <p style={{ color:"#ef4444", fontSize:"12px" }}>⚠️ IBAN غير مضبوط</p>
                )}

                {/* رفع إيصال الدفع */}
                <div style={{ marginTop:"14px", textAlign:"right" }}>
                  <p style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"700", marginBottom:"8px" }}>
                    🧾 رفع إيصال الدفع <span style={{ color:"#ef4444" }}>*</span>
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReceiptChange} style={{ display:"none" }} />

                  {!receiptPreview ? (
                    <div onClick={()=>fileInputRef.current?.click()}
                      style={{ border:"2px dashed var(--gold-border)", borderRadius:"var(--radius)", padding:"20px 16px", textAlign:"center", cursor:"pointer", background:"rgba(212,175,55,0.03)", transition:"var(--transition)" }}
                      onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background="rgba(212,175,55,0.07)"}
                      onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background="rgba(212,175,55,0.03)"}>
                      <div style={{ fontSize:"28px", marginBottom:"6px" }}>📷</div>
                      <p style={{ color:"var(--gold)", fontSize:"13px", fontWeight:"600", margin:"0 0 4px" }}>اضغط لرفع صورة الإيصال</p>
                      <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:0 }}>PNG, JPG حتى 600KB</p>
                    </div>
                  ) : (
                    <div style={{ position:"relative", display:"inline-block", width:"100%" }}>
                      <img src={receiptPreview} alt="إيصال" style={{ width:"100%", maxHeight:"200px", objectFit:"cover", borderRadius:"var(--radius)", border:"2px solid var(--gold-border)" }} />
                      <button onClick={()=>{setReceiptFile(null);setReceiptPreview(null);if(fileInputRef.current)fileInputRef.current.value="";}} className="btn-3d"
                        style={{ position:"absolute", top:"8px", left:"8px", background:"rgba(0,0,0,0.7)", border:"1px solid #ef4444", color:"#ef4444", borderRadius:"50%", width:"28px", height:"28px", cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        ✕
                      </button>
                      <div onClick={()=>fileInputRef.current?.click()}
                        style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(0,0,0,0.7)", border:"1px solid var(--gold)", color:"var(--gold)", borderRadius:"8px", padding:"4px 8px", cursor:"pointer", fontSize:"10px", fontWeight:"700" }}>
                        تغيير
                      </div>
                    </div>
                  )}
                </div>

                <p style={{ color:"var(--amber)", fontSize:"11px", marginTop:"10px", textAlign:"right" }}>
                  بعد التحويل ارفع الإيصال هنا — سيصل مع الطلب للمتجر تلقائياً ✅
                </p>
              </div>
            )}

            {/* استخدام الرصيد */}
            {user && balance>0 && payment!=="balance" && (
              <div style={{ marginTop:"14px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(0,0,0,0.2)", borderRadius:"var(--radius-sm)", padding:"12px 14px" }}>
                <div>
                  <p style={{ color:"var(--text)", fontSize:"13px", margin:0 }}>استخدام الرصيد كخصم</p>
                  <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"2px 0 0" }}>متاح: <span style={{ color:"var(--gold)", fontWeight:"700" }}>{balance.toFixed(3)} BD</span></p>
                </div>
                <div onClick={()=>setUseBalance(!useBalance)}
                  style={{ width:"44px", height:"24px", borderRadius:"99px", background:useBalance?"var(--gold)":"var(--border)", cursor:"pointer", position:"relative", transition:"var(--transition)", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:"3px", [useBalance?"right":"left"]:"3px", width:"18px", height:"18px", borderRadius:"50%", background:useBalance?"#000":"var(--text-muted)", transition:"var(--transition)" } as React.CSSProperties} />
                </div>
              </div>
            )}
          </Section>

          {/* ملاحظات الطلب */}
          <Section title="ملاحظات الطلب (اختياري)" icon="📝">
            <textarea className="inp" placeholder="أضف ملاحظاتك هنا..." value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{ resize:"vertical", display:"block", width:"100%", boxSizing:"border-box" }} />
          </Section>

          {/* مكافأة الرصيد */}
          {storeSettings.loyaltyEnabled && total > 0 && (
            <div style={{ background:"linear-gradient(135deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02))", border:"1px solid var(--gold-border)", borderRadius:"var(--radius)", padding:"12px 16px", marginBottom:"14px", display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ fontSize:"24px" }}>🎁</div>
              <div>
                <p style={{ color:"var(--gold)", fontSize:"13px", fontWeight:"700", margin:0 }}>ستكسب رصيد مكافأة!</p>
                <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:"2px 0 0" }}>
                  عند إتمام الطلب سيُضاف <span style={{ color:"#22c55e", fontWeight:"700" }}>{(total * Number(storeSettings.loyaltyPercent||5)/100).toFixed(3)} BD</span> لرصيدك تلقائياً
                </p>
              </div>
            </div>
          )}

          <button onClick={handleOrder} disabled={loading} className="btn-gold btn-3d"
            style={{ width:"100%", padding:"16px", fontSize:"16px", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}>
            {loading ? <span className="animate-pulse">جاري الإرسال...</span> : "✨ تأكيد الطلب"}
          </button>

          <p style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", color:"var(--text-muted)", fontSize:"11px", marginTop:"14px" }}>
            <img src={securePaymentIcon} alt="" style={{ width:"14px", height:"14px", objectFit:"contain", filter:"invert(1)" }} /> جميع المعاملات آمنة ومشفرة
          </p>
        </div>

        {/* ── Sidebar (left) ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          {/* ملخص الطلب */}
          <div className="card" style={{ padding:"20px" }}>
            <p className="section-title">📄 ملخص الطلب</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"4px", marginBottom:"12px" }}>
              {cart.map((item:any,i:number)=>(
                <div key={i} style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                    {item.image && <img src={item.image} alt="" style={{ width:"38px",height:"38px",objectFit:"cover",borderRadius:"6px",flexShrink:0 }} />}
                    <span style={{ flex:1, color:"var(--text-dim)", fontSize:"12px" }}>{item.name}{(item.selectedSize||item.selectedNecklaceType)&&` (${item.selectedSize||item.selectedNecklaceType})`}<br/><span style={{ color:"var(--text-muted)" }}>{item.quantity} × {item.price.toFixed(3)} BD</span></span>
                    <span style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"700" }}>{(item.price*item.quantity).toFixed(3)} BD</span>
                  </div>
                  {Array.isArray(item.customization) && item.customization.length > 0 && (
                    <div style={{ marginTop:"6px", marginRight:"46px" }}>
                      {item.customization.map((c:any,ci:number)=>(
                        <p key={ci} style={{ color:"var(--gold)", fontSize:"11px", margin:0 }}>🎨 {c.label}: <span style={{ color:"var(--text-muted)" }}>{c.value}</span></p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", color:"var(--text-muted)", fontSize:"12px" }}>
                <span>المجموع الفرعي</span><span>{subtotal.toFixed(3)} BD</span>
              </div>
              {delivery==="delivery" && (
                <div style={{ display:"flex", justifyContent:"space-between", color:"var(--text-muted)", fontSize:"12px" }}>
                  <span>🚚 رسوم التوصيل</span><span>{DELIVERY_FEE.toFixed(3)} BD</span>
                </div>
              )}
              {couponDiscount>0 && (
                <div style={{ display:"flex", justifyContent:"space-between", color:"#22c55e", fontSize:"12px" }}>
                  <span>🏷️ خصم (كود: {coupon.code})</span><span>-{couponDiscount.toFixed(3)} BD</span>
                </div>
              )}
              {balanceDiscount>0 && (
                <div style={{ display:"flex", justifyContent:"space-between", color:"#22c55e", fontSize:"12px" }}>
                  <span>💰 خصم الرصيد</span><span>-{balanceDiscount.toFixed(3)} BD</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", color:"var(--text)", fontWeight:"800", fontSize:"17px", paddingTop:"10px", marginTop:"4px", borderTop:"1px solid var(--border)" }}>
                <span>الإجمالي</span><span style={{ color:"var(--gold)" }}>{total.toFixed(3)} BD</span>
              </div>
            </div>
          </div>

          {/* لماذا تختارنا */}
          <div className="card" style={{ padding:"20px" }}>
            <p className="section-title">لماذا تختارنا؟</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {[[fastDeliveryIcon,"توصيل سريع وآمن"],[qualityIcon,"منتجات عالية الجودة"],[customerServiceIcon,"دعم العملاء 24/7"]].map(([icon,label]) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  <img src={icon} alt="" style={{ width:"16px", height:"16px", objectFit:"contain", filter:"invert(1)" }} />
                  <span style={{ color:"var(--text-dim)", fontSize:"13px" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* جودة تفوق التوقعات */}
          <div className="card" style={{ padding:"20px", display:"flex", alignItems:"center", gap:"14px" }}>
            <div className="icon-badge-3d" style={{ width:"44px", height:"44px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", flexShrink:0 }}>
              <img src={qualityIcon} alt="" style={{ width:"20px", height:"20px", objectFit:"contain" }} />
            </div>
            <div>
              <p style={{ color:"var(--gold)", fontSize:"13px", fontWeight:"700", margin:0 }}>جودة تفوق التوقعات</p>
              <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"4px 0 0", lineHeight:1.6 }}>نختار أجود الخامات لضمان أعلى جودة</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, icon, children }: { title:string; icon?:string; children:React.ReactNode }) {
  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"18px", marginBottom:"14px" }}>
      <p className="section-title">{icon ? `${icon} ${title}` : title}</p>
      {children}
    </div>
  );
}
