import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";

const DEFAULT_CATEGORIES = [
  { value: "rings",    label: "خواتم",  icon: "💍" },
  { value: "necklace", label: "سلاسل",  icon: "📿" },
  { value: "bracelet", label: "أساور",  icon: "✨" },
];

export default function StoreSettings() {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    storeName: "العقيلة",
    whatsapp: "",
    iban: "",
    deliveryFee: "2",
    deliveryNote: "",
    pickupNote: "سيتواصل معك البائع لتحديد وقت الاستلام",
    minOrder: "0",
    freeDeliveryMin: "",
    loyaltyPercent: "5",      // % من قيمة الطلب يُضاف كرصيد
    loyaltyEnabled: true,     // تفعيل نظام الرصيد
    loyaltyMinOrder: "0",     // حد أدنى للطلب لكسب الرصيد
    couponEnabled: false,     // تفعيل كود الخصم
    couponCode: "",           // كود الخصم (كود واحد فعّال بنفس الوقت)
    couponDiscount: "0",      // قيمة الخصم الثابتة (BD)
  });
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCat, setNewCat]     = useState({ value:"", label:"", icon:"🏷️" });
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [tab,     setTab]       = useState<"general"|"delivery"|"loyalty"|"coupon"|"categories">("general");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "store"));
        if (snap.exists()) {
          const d = snap.data();
          setForm(f => ({ ...f, ...d }));
          if (d.categories) setCategories(d.categories);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, "settings", "store"), { ...form, categories, updatedAt: new Date() });
      showToast("تم حفظ الإعدادات ✅", "success");
    } catch { showToast("فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  const addCategory = () => {
    if (!newCat.value.trim() || !newCat.label.trim()) { showToast("أدخل اسم القسم والمعرّف", "warning"); return; }
    if (categories.find(c => c.value === newCat.value)) { showToast("هذا القسم موجود بالفعل", "warning"); return; }
    setCategories(prev => [...prev, { ...newCat, value: newCat.value.trim().toLowerCase().replace(/\s/g,"_") }]);
    setNewCat({ value:"", label:"", icon:"🏷️" });
    showToast("تمت إضافة القسم", "success");
  };

  const removeCategory = (val: string) => {
    if (categories.length <= 1) { showToast("يجب أن يبقى قسم واحد على الأقل", "warning"); return; }
    setCategories(prev => prev.filter(c => c.value !== val));
    showToast("تم حذف القسم ✅", "success");
  };

  if (loading) return <div style={{ textAlign:"center", padding:"40px", color:"var(--text-muted)" }}>جاري التحميل...</div>;

  const Field = ({ label, hint, children }: any) => (
    <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
      <label style={{ color:"var(--text-muted)", fontSize:"12px", display:"block" }}>{label}</label>
      {hint && <p style={{ color:"rgba(100,116,139,0.6)", fontSize:"11px", margin:0 }}>{hint}</p>}
      <div style={{ width:"100%" }}>{children}</div>
    </div>
  );

  const tabs = [
    { key:"general",    label:"🏪 عام" },
    { key:"delivery",   label:"🚗 توصيل" },
    { key:"loyalty",    label:"💰 الرصيد" },
    { key:"coupon",     label:"🎟️ كود الخصم" },
    { key:"categories", label:"🏷️ الأقسام" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      {/* Tab bar */}
      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding:"8px 16px", borderRadius:"var(--radius-sm)", border:`1px solid ${tab===t.key?"var(--gold)":"var(--border)"}`, background:tab===t.key?"var(--gold-dim)":"transparent", color:tab===t.key?"var(--gold)":"var(--text-muted)", cursor:"pointer", fontSize:"12px", fontWeight:tab===t.key?"700":"400", fontFamily:"inherit", transition:"var(--transition)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === "general" && (
        <div className="card" style={{ padding:"20px" }}>
          <p className="section-title">🏪 معلومات المتجر</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <Field label="اسم المتجر">
              <input className="inp" value={form.storeName} onChange={e => f("storeName", e.target.value)} placeholder="العقيلة" />
            </Field>
            <Field label="رقم واتساب" hint="بدون + (مثال: 97312345678)">
              <input className="inp" value={form.whatsapp} onChange={e => f("whatsapp", e.target.value)} placeholder="97312345678" dir="ltr" />
            </Field>
            <Field label="IBAN — Benefit" hint="رقم IBAN لحسابك البنكي">
              <input className="inp" value={form.iban} onChange={e => f("iban", e.target.value)} placeholder="BH29BMAG1299123456BHD01" dir="ltr" />
            </Field>
          </div>
        </div>
      )}

      {/* Delivery */}
      {tab === "delivery" && (
        <div className="card" style={{ padding:"20px" }}>
          <p className="section-title">🚗 إعدادات التوصيل</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              <Field label="رسوم التوصيل (BD)">
                <input className="inp" type="number" value={form.deliveryFee} onChange={e => f("deliveryFee", e.target.value)} min="0" step="0.5" dir="ltr" />
              </Field>
              <Field label="توصيل مجاني فوق (BD)" hint="فارغ = لا يوجد">
                <input className="inp" type="number" value={form.freeDeliveryMin} onChange={e => f("freeDeliveryMin", e.target.value)} min="0" dir="ltr" placeholder="مثال: 20" />
              </Field>
            </div>
            <Field label="حد الطلب الأدنى (BD)">
              <input className="inp" type="number" value={form.minOrder} onChange={e => f("minOrder", e.target.value)} min="0" dir="ltr" />
            </Field>
            <Field label="ملاحظة التوصيل">
              <textarea className="inp" value={form.deliveryNote} onChange={e => f("deliveryNote", e.target.value)} placeholder="ملاحظة تظهر للعميل..." rows={3} style={{ resize:"vertical", width:"100%", boxSizing:"border-box", display:"block" }} />
            </Field>
            <Field label="ملاحظة الاستلام الشخصي">
              <textarea className="inp" value={form.pickupNote} onChange={e => f("pickupNote", e.target.value)} rows={3} style={{ resize:"vertical", width:"100%", boxSizing:"border-box", display:"block" }} />
            </Field>
          </div>
        </div>
      )}

      {/* Loyalty / Balance system */}
      {tab === "loyalty" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div className="card" style={{ padding:"20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <p className="section-title" style={{ margin:0 }}>💰 نظام مكافآت الرصيد</p>
              {/* Toggle */}
              <div onClick={() => f("loyaltyEnabled", !form.loyaltyEnabled)}
                style={{ width:"44px", height:"24px", borderRadius:"99px", background:form.loyaltyEnabled?"var(--gold)":"var(--border)", cursor:"pointer", position:"relative", transition:"var(--transition)", flexShrink:0 }}>
                <div style={{ position:"absolute", top:"3px", [form.loyaltyEnabled?"right":"left"]:"3px", width:"18px", height:"18px", borderRadius:"50%", background:form.loyaltyEnabled?"#000":"var(--text-muted)", transition:"var(--transition)" }} />
              </div>
            </div>

            <div style={{ background:"rgba(212,175,55,0.06)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius-sm)", padding:"12px 14px", marginBottom:"14px" }}>
              <p style={{ color:"var(--gold)", fontSize:"13px", margin:"0 0 4px", fontWeight:"700" }}>⚡ كيف يعمل النظام؟</p>
              <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:0, lineHeight:1.6 }}>
                عند تحديث حالة الطلب إلى "تم التوصيل" أو "تم الاستلام"، يُضاف للعميل رصيد تلقائياً بنسبة معينة من قيمة طلبه. يمكن للعميل استخدام هذا الرصيد كخصم في طلباته القادمة.
              </p>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"12px", opacity:form.loyaltyEnabled?1:0.4, pointerEvents:form.loyaltyEnabled?"auto":"none" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <Field label="نسبة الرصيد %" hint="نسبة من قيمة الطلب تُضاف كرصيد">
                  <input className="inp" type="number" value={form.loyaltyPercent} onChange={e => f("loyaltyPercent", e.target.value)} min="0" max="50" dir="ltr" />
                </Field>
                <Field label="حد أدنى للطلب (BD)" hint="أقل قيمة طلب يكسب رصيداً">
                  <input className="inp" type="number" value={form.loyaltyMinOrder} onChange={e => f("loyaltyMinOrder", e.target.value)} min="0" dir="ltr" />
                </Field>
              </div>
              {/* Preview */}
              <div style={{ background:"rgba(0,0,0,0.3)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"12px 14px" }}>
                <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:"0 0 4px" }}>مثال توضيحي:</p>
                <p style={{ color:"var(--text)", fontSize:"13px", margin:0 }}>
                  طلب بقيمة <span style={{ color:"var(--gold)", fontWeight:"700" }}>10.000 BD</span> → رصيد مكتسب: <span style={{ color:"#22c55e", fontWeight:"700" }}>{(10 * Number(form.loyaltyPercent||0)/100).toFixed(3)} BD</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coupon */}
      {tab === "coupon" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div className="card" style={{ padding:"20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <p className="section-title" style={{ margin:0 }}>🎟️ كود الخصم</p>
              <div onClick={() => f("couponEnabled", !form.couponEnabled)}
                style={{ width:"44px", height:"24px", borderRadius:"99px", background:form.couponEnabled?"var(--gold)":"var(--border)", cursor:"pointer", position:"relative", transition:"var(--transition)", flexShrink:0 }}>
                <div style={{ position:"absolute", top:"3px", [form.couponEnabled?"right":"left"]:"3px", width:"18px", height:"18px", borderRadius:"50%", background:form.couponEnabled?"#000":"var(--text-muted)", transition:"var(--transition)" }} />
              </div>
            </div>

            <div style={{ background:"rgba(212,175,55,0.06)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius-sm)", padding:"12px 14px", marginBottom:"14px" }}>
              <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:0, lineHeight:1.6 }}>
                كود خصم واحد فعّال بنفس الوقت. العميل يدخله بصفحة السلة، ويُخصم مبلغ ثابت من الإجمالي.
              </p>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"12px", opacity:form.couponEnabled?1:0.4, pointerEvents:form.couponEnabled?"auto":"none" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <Field label="الكود" hint="مثال: AQ-2025">
                  <input className="inp" value={form.couponCode} onChange={e => f("couponCode", e.target.value.toUpperCase())} dir="ltr" />
                </Field>
                <Field label="قيمة الخصم (BD)">
                  <input className="inp" type="number" value={form.couponDiscount} onChange={e => f("couponDiscount", e.target.value)} min="0" dir="ltr" />
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === "categories" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div className="card" style={{ padding:"20px" }}>
            <p className="section-title">🏷️ الأقسام الحالية</p>
            <p style={{ color:"var(--text-muted)", fontSize:"12px", marginBottom:"14px" }}>
              هذه الأقسام تظهر في صفحة المتجر للعملاء كأزرار تصفية.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {categories.map(cat => (
                <div key={cat.value} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)" }}>
                  <span style={{ fontSize:"20px" }}>{cat.icon}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ color:"var(--text)", fontSize:"13px", fontWeight:"600", margin:0 }}>{cat.label}</p>
                    <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"2px 0 0" }}>{cat.value}</p>
                  </div>
                  <button onClick={() => removeCategory(cat.value)}
                    style={{ padding:"5px 10px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"7px", color:"#ef4444", cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>
                    🗑️ حذف
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add new category */}
          <div className="card" style={{ padding:"20px" }}>
            <p className="section-title">➕ إضافة قسم جديد</p>
            <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 1fr", gap:"10px", marginBottom:"12px" }}>
              <div>
                <label style={{ color:"var(--text-muted)", fontSize:"11px", display:"block", marginBottom:"4px" }}>أيقونة</label>
                <input value={newCat.icon} onChange={e => setNewCat(n => ({ ...n, icon: e.target.value }))} className="inp" style={{ textAlign:"center", fontSize:"20px", padding:"8px" }} />
              </div>
              <div>
                <label style={{ color:"var(--text-muted)", fontSize:"11px", display:"block", marginBottom:"4px" }}>الاسم العربي</label>
                <input value={newCat.label} onChange={e => setNewCat(n => ({ ...n, label: e.target.value }))} className="inp" placeholder="مثال: قلائد" />
              </div>
              <div>
                <label style={{ color:"var(--text-muted)", fontSize:"11px", display:"block", marginBottom:"4px" }}>المعرّف (إنجليزي)</label>
                <input value={newCat.value} onChange={e => setNewCat(n => ({ ...n, value: e.target.value.toLowerCase().replace(/\s/g,"_") }))} className="inp" placeholder="مثال: pendants" dir="ltr" />
              </div>
            </div>
            <button onClick={addCategory} className="btn-gold" style={{ width:"100%", padding:"11px" }}>
              + إضافة القسم
            </button>
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className="btn-gold" style={{ width:"100%", opacity:saving?0.6:1 }}>
        {saving ? "جاري الحفظ..." : "💾 حفظ جميع الإعدادات"}
      </button>
    </div>
  );
}
