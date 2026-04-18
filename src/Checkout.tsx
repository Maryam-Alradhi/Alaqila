import { useState, useContext, useEffect, useRef } from "react";
import { CartContext } from "./CartContext";
import { collection, addDoc, updateDoc, serverTimestamp, doc, getDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

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

async function getTelegramSettings() {
  try {
    const snap = await getDoc(doc(db,"settings","telegram"));
    if (snap.exists()) return snap.data() as {botToken:string;chatId:string};
  } catch {}
  return null;
}

// تحويل الصورة إلى Base64 للإرسال المباشر لتلجرام — بدون رفع على السيرفر
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Checkout() {
  const { cart, clearCart } = useContext(CartContext);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const topRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name,        setName]        = useState(profile?.name    || "");
  const [phone,       setPhone]       = useState(profile?.phone   || "");
  const [address,     setAddress]     = useState(profile?.address || "");
  const [loading,     setLoading]     = useState(false);
  const [payment,     setPayment]     = useState<"cod"|"benefit"|"balance"|null>(null);   // ← null = لم يختر بعد
  const [delivery,    setDelivery]    = useState<"delivery"|"pickup"|null>(null);           // ← null = لم يختر بعد
  const [useBalance,  setUseBalance]  = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>({ deliveryFee:"2", loyaltyPercent:"5", loyaltyEnabled:true });

  // إيصال الدفع
  const [receiptFile,    setReceiptFile]    = useState<File|null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string|null>(null);

  // scroll للأعلى عند فتح الصفحة
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  useEffect(() => {
    getDoc(doc(db,"settings","store")).then(snap => { if (snap.exists()) setStoreSettings(snap.data()); }).catch(()=>{});
  }, []);

  const DELIVERY_FEE   = Number(storeSettings.deliveryFee ?? 2);
  const subtotal       = cart.reduce((s:number,i:any)=>s+(i.price||0)*(i.quantity||0),0);
  const delivFee       = delivery==="delivery" ? DELIVERY_FEE : 0;
  const balance        = profile?.balance || 0;
  const balanceDiscount = useBalance ? Math.min(balance, subtotal+delivFee) : 0;
  const total          = Math.max(0, subtotal+delivFee-balanceDiscount);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("اختر صورة فقط 🖼️","warning"); return; }
    if (file.size > 10*1024*1024) { showToast("الحجم الأقصى 10MB","warning"); return; }
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

      // فحص الكمية — بشكل آمن
      try {
        for (const item of cart) {
          if (!item?.id) continue;
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

      // تحويل الإيصال لـ Base64
      let receiptBase64 = "";
      let receiptMime   = "";
      if (payment==="benefit" && receiptFile) {
        receiptBase64 = await fileToBase64(receiptFile);
        receiptMime   = receiptFile.type || "image/jpeg";
      }

      const orderNumber = generateOrderNumber();

      // تنظيف الـ items قبل الحفظ — Firestore لا يقبل undefined أو قيم غير صالحة
      const cleanItems = cart.map((item: any) => ({
        id:           item.id           ?? "",
        name:         item.name         ?? "",
        price:        Number(item.price ?? 0),
        quantity:     Number(item.quantity ?? 1),
        image:        item.image        ?? "",
        selectedSize: item.selectedSize ?? null,
      }));

      // حفظ الطلب
      await addDoc(collection(db,"orders"), {
        orderNumber,
        userId:        user?.uid ?? null,
        customer: {
          name:    name.trim(),
          phone:   phone.trim(),
          address: address.trim(),
        },
        items:         cleanItems,
        subtotal:      Number(subtotal)      || 0,
        deliveryFee:   Number(delivFee)      || 0,
        balanceDiscount: Number(balanceDiscount) || 0,
        total:         Number(total)         || 0,
        paymentMethod: payment    ?? "cod",
        deliveryType:  delivery   ?? "delivery",
        hasReceipt:    receiptBase64 !== "",
        status:        "pending",
        createdAt:     serverTimestamp(),
      });

      // خصم الرصيد — مسجلين فقط
      if (useBalance && balanceDiscount>0 && user) {
        try {
          await updateDoc(doc(db,"users",user.uid),{balance:increment(-balanceDiscount)});
          refreshProfile();
        } catch { /* ما نوقف الطلب لو فشل خصم الرصيد */ }
      }

      // إشعار تلجرام — النص + الصورة
      try {
        const tg = await getTelegramSettings();
        if (tg?.botToken && tg?.chatId) {
          const itemsList = cart.map((item:any)=>`• ${item.name}${item.selectedSize?` (م${item.selectedSize})`:""} × ${item.quantity} — ${(item.price*item.quantity).toFixed(3)} BD`).join("\n");
          const delivLine = delivery==="delivery" ? `📍 *العنوان:* ${address.trim()}\n🚗 *توصيل:* ${delivFee} BD` : `🤝 *الاستلام:* شخصي`;
          const balLine   = balanceDiscount>0 ? `\n💰 *خصم الرصيد:* -${balanceDiscount.toFixed(3)} BD` : "";
          const receiptLine = receiptBase64 ? "\n🧾 *إيصال الدفع:* مُرفق ✅" : "";
          const msg = `🛒 *طلب جديد — ${orderNumber}*\n\n👤 *الاسم:* ${name.trim()}\n📞 *الهاتف:* ${phone.trim()}\n${delivLine}\n💳 *الدفع:* ${payment==="cod"?"كاش":payment==="benefit"?"Benefit":"رصيد"}${balLine}${receiptLine}\n\n📦 *المنتجات:*\n${itemsList}\n\n💰 *الإجمالي: ${total.toFixed(3)} BD*`;

          // أرسل النص
          await fetch(`https://api.telegram.org/bot${tg.botToken}/sendMessage`,{
            method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({chat_id:tg.chatId, text:msg, parse_mode:"Markdown"}),
          });

          // أرسل صورة الإيصال مباشرة بـ multipart/form-data — بدون رفع على سيرفر
          if (receiptBase64) {
            const blob = await fetch(`data:${receiptMime};base64,${receiptBase64}`).then(r=>r.blob());
            const fd   = new FormData();
            fd.append("chat_id", tg.chatId);
            fd.append("photo",   blob, "receipt.jpg");
            fd.append("caption", `🧾 إيصال الدفع — ${orderNumber}`);
            await fetch(`https://api.telegram.org/bot${tg.botToken}/sendPhoto`,{
              method:"POST", body: fd,
            });
          }
        }
      } catch {}

      clearCart();
      showToast(`تم إرسال طلبك! رقم الطلب: ${orderNumber} 🎉`,"success");
      setTimeout(()=>navigate("/track/"+orderNumber),1500);
    } catch(e) {
      console.error(e); showToast("حدث خطأ، حاول مرة أخرى 😢","error");
    } finally { setLoading(false); }
  };

  if (cart.length===0) return (
    <div style={{ textAlign:"center", marginTop:"80px", padding:"20px" }}>
      <div style={{ fontSize:"52px", marginBottom:"16px" }}>🛒</div>
      <h2 style={{ color:"var(--gold)" }}>السلة فارغة</h2>
      <button onClick={()=>navigate("/shop")} className="btn-gold" style={{ marginTop:"20px" }}>العودة للمتجر</button>
    </div>
  );

  const BENEFIT_IBAN = storeSettings.iban || (import.meta.env.VITE_BENEFIT_IBAN as string);
  const WA = storeSettings.whatsapp || (import.meta.env.VITE_WHATSAPP_NUMBER as string);

  return (
    <div ref={topRef} style={{ padding:"32px 16px", maxWidth:"560px", margin:"0 auto", direction:"rtl" }}>
      <h1 style={{ color:"var(--gold)", textAlign:"center", marginBottom:"28px", fontSize:"22px", fontWeight:"800" }}>
        🧾 إتمام الطلب
      </h1>

      {/* معلومات العميل */}
      <Section title="معلومات العميل">
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute",top:"50%",right:"14px",transform:"translateY(-50%)" }}>👤</span>
            <input className="inp" placeholder="الاسم الكامل" value={name} onChange={e=>setName(e.target.value)} style={{ paddingRight:"42px" }} />
          </div>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute",top:"50%",right:"14px",transform:"translateY(-50%)" }}>📞</span>
            <input className="inp" placeholder="رقم الهاتف" value={phone} onChange={e=>setPhone(e.target.value)} dir="ltr" style={{ paddingRight:"42px" }} />
          </div>
        </div>
      </Section>

      {/* طريقة الاستلام */}
      <Section title="طريقة الاستلام">
        <div style={{ display:"flex", gap:"10px", marginBottom:"10px" }}>
          {(["delivery","pickup"] as const).map(d=>(
            <button key={d} onClick={()=>setDelivery(d)}
              style={{ flex:1, padding:"12px", borderRadius:"var(--radius)", border:`2px solid ${delivery===d?"var(--gold)":"var(--border)"}`, background:delivery===d?"var(--gold-dim)":"transparent", color:delivery===d?"var(--gold)":"var(--text-muted)", cursor:"pointer", fontWeight:"700", fontSize:"13px", transition:"var(--transition)", fontFamily:"inherit" }}>
              {d==="delivery"?"🚗 توصيل (+"+DELIVERY_FEE+" BD)":"🤝 استلام شخصي"}
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

      {/* طريقة الدفع */}
      <Section title="طريقة الدفع">
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"12px" }}>
          {(["cod","benefit","balance"] as const).map(p=>{
            const disabled = p==="balance" && balance<=0;
            return (
              <button key={p} onClick={()=>!disabled&&setPayment(p)} disabled={disabled}
                style={{ flex:1, minWidth:"90px", padding:"11px 8px", borderRadius:"var(--radius)", border:`2px solid ${payment===p?"var(--gold)":"var(--border)"}`, background:payment===p?"var(--gold-dim)":"transparent", color:disabled?"var(--text-muted)":payment===p?"var(--gold)":"var(--text-dim)", cursor:disabled?"not-allowed":"pointer", fontWeight:"700", fontSize:"12px", transition:"var(--transition)", fontFamily:"inherit", opacity:disabled?0.5:1 }}>
                {p==="cod"?"💵 كاش":p==="benefit"?"💳 Benefit":`💰 رصيد\n${balance.toFixed(3)} BD`}
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
                  <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:0 }}>PNG, JPG حتى 10MB</p>
                </div>
              ) : (
                <div style={{ position:"relative", display:"inline-block", width:"100%" }}>
                  <img src={receiptPreview} alt="إيصال" style={{ width:"100%", maxHeight:"200px", objectFit:"cover", borderRadius:"var(--radius)", border:"2px solid var(--gold-border)" }} />
                  <button onClick={()=>{setReceiptFile(null);setReceiptPreview(null);if(fileInputRef.current)fileInputRef.current.value="";}}
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
      </Section>

      {/* استخدام الرصيد */}
      {user && balance>0 && payment!=="balance" && (
        <Section title="رصيدك">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ color:"var(--text)", fontSize:"14px", margin:0 }}>استخدام الرصيد كخصم</p>
              <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:"2px 0 0" }}>متاح: <span style={{ color:"var(--gold)", fontWeight:"700" }}>{balance.toFixed(3)} BD</span></p>
            </div>
            <div onClick={()=>setUseBalance(!useBalance)}
              style={{ width:"44px", height:"24px", borderRadius:"99px", background:useBalance?"var(--gold)":"var(--border)", cursor:"pointer", position:"relative", transition:"var(--transition)", flexShrink:0 }}>
              <div style={{ position:"absolute", top:"3px", [useBalance?"right":"left"]:"3px", width:"18px", height:"18px", borderRadius:"50%", background:useBalance?"#000":"var(--text-muted)", transition:"var(--transition)" }} />
            </div>
          </div>
        </Section>
      )}

      {/* ملخص الطلب */}
      <Section title="ملخص الطلب">
        <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
          {cart.map((item:any,i:number)=>(
            <div key={i} style={{ display:"flex", gap:"8px", alignItems:"center", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
              {item.image && <img src={item.image} alt="" style={{ width:"34px",height:"34px",objectFit:"cover",borderRadius:"6px",flexShrink:0 }} />}
              <span style={{ flex:1, color:"var(--text-dim)", fontSize:"12px" }}>{item.name}{item.selectedSize&&` (${item.selectedSize})`} × {item.quantity}</span>
              <span style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"700" }}>{(item.price*item.quantity).toFixed(3)} BD</span>
            </div>
          ))}
          {delivery==="delivery" && (
            <div style={{ display:"flex", justifyContent:"space-between", color:"var(--text-muted)", fontSize:"12px", padding:"4px 0" }}>
              <span>🚗 رسوم التوصيل</span><span>{DELIVERY_FEE}.000 BD</span>
            </div>
          )}
          {balanceDiscount>0 && (
            <div style={{ display:"flex", justifyContent:"space-between", color:"#22c55e", fontSize:"12px", padding:"4px 0" }}>
              <span>💰 خصم الرصيد</span><span>-{balanceDiscount.toFixed(3)} BD</span>
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", color:"var(--text)", fontWeight:"800", fontSize:"17px", paddingTop:"10px", marginTop:"4px", borderTop:"1px solid var(--border)" }}>
            <span>الإجمالي</span><span style={{ color:"var(--gold)" }}>{total.toFixed(3)} BD</span>
          </div>
        </div>
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

      <button onClick={handleOrder} disabled={loading} className="btn-gold"
        style={{ width:"100%", padding:"15px", fontSize:"16px", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}>
        {loading ? <span className="animate-pulse">جاري الإرسال...</span> : "تأكيد الطلب 🚀"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"16px 18px", marginBottom:"14px" }}>
      <p className="section-title">{title}</p>
      {children}
    </div>
  );
}
