import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, deleteField,
} from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";
import { getActiveDiscount, getDiscountedPrice } from "./pricing";

const CATEGORIES = [
  { value: "rings",    label: "💍 خواتم" },
  { value: "necklace", label: "⛓️ سلاسل" },
  { value: "bracelet", label: "💫 أساور" },
  { value: "misbaha",  label: "📿 مسابيح" },
  { value: "other",    label: "✨ أخرى" },
];

export type CustomField = { label: string; required: boolean };
export type NecklaceType = { name: string; price: string };

const emptyForm = {
  name: "", price: "", category: "rings", description: "",
  images: [""] as string[], video: "",
  quantity: "0",
  isNew: false,
  isFeatured: false,
  discount: "",
  discountEndsAt: "", // ✅ اختياري — لو فاضي، الخصم يضل شغال لين تلغينه يدوياً
  gender: "" as "" | "female" | "male" | "kids", // ✅ اختياري — فاضي معناه للجميع
  // ✅ أنواع السلسلة — تظهر بس لقسم "سلاسل"، كل نوع له سعره الخاص، والعميل يختار وقت الطلب
  necklaceTypes: [] as NecklaceType[],
};

// ✅ يكشف روابط صفحات العرض الشائعة (مو رابط الصورة نفسها) ويرجّع نصيحة توضح الفرق
function isPageLinkNotDirect(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (/^https?:\/\/(www\.)?imgur\.com\//i.test(u) && !/^https?:\/\/i\.imgur\.com\//i.test(u)) {
    return 'افتح الصورة داخل الصفحة، اضغط عليها بزر الفأرة اليمين واختر "نسخ عنوان الصورة" (تبدأ بـ i.imgur.com).';
  }
  if (/^https?:\/\/(www\.)?ibb\.co\//i.test(u) && !/^https?:\/\/i\.ibb\.co\//i.test(u)) {
    return 'من صفحة الصورة في ImgBB اختر "Direct link" وانسخه (يبدأ بـ i.ibb.co).';
  }
  return null;
}

// ── Main Component ──────────────────────────────────────────
export default function ManageProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editWasSoldOut, setEditWasSoldOut] = useState(false);
  const [form, setForm]         = useState({ ...emptyForm });
  const [search, setSearch]     = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const { showToast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "products"));
      // ✅ المنتجات المصنوعة حسب الطلب (customizable) تُدار حصرياً من تبويب "الصياغة حسب الطلب" —
      // نستبعدها هنا عشان محد يعدّلها من هذا النموذج (اللي يعيد يخترع رقم كمية وهمي لها بالخطأ)
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((p: any) => !p.customizable));
    } catch { showToast("خطأ في التحميل", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    // منتجات قديمة كانت مقسّمة بمقاسات — نجمعها بكمية وحدة عند التعديل
    const legacySizesTotal = p.sizes && typeof p.sizes === "object"
      ? Object.values(p.sizes).reduce((s: number, v: any) => s + Number(v || 0), 0)
      : null;
    setForm({
      name: p.name || "",
      price: String(p.price || ""),
      category: p.category || "rings",
      description: p.description || "",
      images: Array.isArray(p.images) && p.images.length ? [...p.images] : (p.image ? [p.image] : [""]),
      video: p.video || "",
      quantity: String(legacySizesTotal ?? p.quantity ?? "0"),
      isNew: !!p.isNew,
      isFeatured: !!p.isFeatured,
      discount: String(p.discount || ""),
      discountEndsAt: p.discountEndsAt || "",
      gender: ["female","male","kids"].includes(p.gender) ? p.gender : "",
      necklaceTypes: Array.isArray(p.necklaceTypes)
        ? p.necklaceTypes.map((t: any) => ({ name: String(t.name || ""), price: String(t.price ?? "") }))
        : [],
    });
    setEditId(p.id);
    setEditWasSoldOut(Number(p.quantity ?? 0) === 0);
    setShowForm(true);
  };

  // ✅ يبلّغ كل العملاء المسجّلين "نبهيني لما يتوفر" لهذا المنتج، ثم يصفّي تسجيلاتهم (إشعار لمرة وحدة)
  const notifyBackInStock = async (productId: string, productName: string) => {
    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
    const templateId = import.meta.env.VITE_EMAILJS_RESTOCK_TEMPLATE_ID as string | undefined;
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
    try {
      const snap = await getDocs(collection(db, "stockAlerts"));
      const alerts = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(a => a.productId === productId);
      if (alerts.length === 0) return;
      if (serviceId && templateId && publicKey) {
        const emailjs = await import("@emailjs/browser");
        for (const alert of alerts) {
          try {
            await emailjs.default.send(serviceId, templateId, {
              to_email: alert.email,
              product_name: productName,
              product_url: `https://alaqila-store.vercel.app/product/${productId}`,
            }, { publicKey });
          } catch { /* نكمل حتى لو فشل إيميل عميل معيّن */ }
        }
      }
      await Promise.all(alerts.map(a => deleteDoc(doc(db, "stockAlerts", a.id))));
      showToast(`🔔 تم تنبيه ${alerts.length} عميل إن "${productName}" رجع متوفر`, "info");
    } catch { /* تنبيه اختياري، ما يوقف حفظ المنتج */ }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("أدخل اسم المنتج", "warning"); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      showToast("أدخل سعراً صحيحاً", "warning"); return;
    }
    const images = form.images.map(s => s.trim()).filter(Boolean);
    if (images.length === 0 && !form.video.trim()) {
      showToast("أدخل صورة أو رابط فيديو", "warning"); return;
    }

    // ✅ أنواع السلسلة — نتجاهل الصفوف الفاضية تماماً، ونتحقق من أي صف فيه اسم بس بلا سعر صحيح
    const rawTypes = form.category === "necklace" ? form.necklaceTypes.filter(t => t.name.trim() || t.price.trim()) : [];
    for (const t of rawTypes) {
      if (!t.name.trim()) { showToast("أدخل اسم كل نوع سلسلة أضفتيه", "warning"); return; }
      if (!t.price || isNaN(Number(t.price)) || Number(t.price) <= 0) {
        showToast(`أدخل سعراً صحيحاً لنوع "${t.name}"`, "warning"); return;
      }
    }
    const necklaceTypes = rawTypes.map(t => ({ name: t.name.trim(), price: Number(t.price) }));

    const data: any = {
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      description: form.description.trim(),
      image: images[0] || "",
      images,
      video: form.video.trim(),
      isNew: form.isNew,
      isFeatured: form.isFeatured,
      // ✅ نحصر الخصم بين 0 و99% دايماً — خصم 100% أو أكثر يخلي السعر صفر أو بالسالب
      discount: Math.min(99, Math.max(0, Number(form.discount) || 0)),
      discountEndsAt: form.discountEndsAt || null, // ✅ اختياري — بعد هذا التاريخ الخصم يوقف تلقائياً
      gender: form.gender || null, // ✅ اختياري — null معناه للجنسين
    };

    data.quantity = Number(form.quantity) || 0;

    try {
      setSaving(true);
      if (editId) {
        // نشيل حقل sizes القديم (إن وجد) عشان المنتج ينتقل بالكامل لنظام الكمية الموحّد
        // ونحدّث أنواع السلسلة دايماً (نمسحها لو صارت فاضية أو تغيّر القسم عن سلاسل)
        await updateDoc(doc(db, "products", editId), {
          ...data, sizes: deleteField(),
          necklaceTypes: necklaceTypes.length ? necklaceTypes : deleteField(),
        });
        showToast("تم التحديث ✅", "success");
        // ✅ رجعت الكمية من صفر لموجب — نبلّغ اللي مسجّلين "نبهيني لما يتوفر"
        if (editWasSoldOut && data.quantity > 0) notifyBackInStock(editId, data.name);
      } else {
        await addDoc(collection(db, "products"), {
          ...data,
          ...(necklaceTypes.length ? { necklaceTypes } : {}),
          createdAt: serverTimestamp(),
        });
        showToast("تمت الإضافة 🎉", "success");
      }
      setShowForm(false);
      load();
    } catch { showToast("فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`حذف "${name}"؟`)) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast("تم الحذف", "info");
    } catch { showToast("فشل الحذف", "error"); }
  };

  // ✅ منتج مصنوع حسب الطلب (customizable) بلا مخزون إطلاقاً — نعتبره "بلا حد" بدل ما نعرض رقم وهمي
  const totalStock = (p: any) => p.customizable ? Infinity : p.sizes
    ? Object.values(p.sizes).reduce((s: number, v: any) => s + Number(v), 0)
    : Number(p.quantity || 0);

  const filtered = products
    .filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    .filter(p => catFilter === "all" ? true : p.category === catFilter)
    .filter(p => {
      const s = totalStock(p);
      if (stockFilter === "soldout")  return s === 0;
      if (stockFilter === "low")      return s > 0 && s <= 3;
      if (stockFilter === "instock")  return s > 3;
      return true;
    });


  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:"10px", marginBottom:"14px", flexWrap:"wrap" }}>
        <input
          placeholder="🔍 بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="inp"
          style={{ flex:1, minWidth:"140px" }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="inp" style={{ width:"auto", paddingLeft:"10px" }}>
          <option value="all">كل الأقسام</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button onClick={openAdd} className="btn-gold" style={{ padding:"9px 18px", fontSize:"13px", whiteSpace:"nowrap" }}>
          + إضافة منتج
        </button>
        <button onClick={load} className="btn-3d"
          style={{ padding:"9px 14px", background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", color:"var(--text-muted)", cursor:"pointer", fontSize:"13px" }}>
          🔄
        </button>
      </div>

      {/* Stats bar — clickable filters */}
      <div style={{ display:"flex", gap:"10px", marginBottom:"18px", flexWrap:"wrap" }}>
        {[
          { label:"الكل",         val: products.length,                                                              c:"var(--gold)",  filter:"all"      },
          { label:"نفذ المخزون", val: products.filter(p=>totalStock(p)===0).length,                                  c:"#ef4444",      filter:"soldout"  },
          { label:"مخزون منخفض", val: products.filter(p=>{const s=totalStock(p);return s>0&&s<=3}).length,           c:"#f59e0b",      filter:"low"      },
          { label:"متوفر",        val: products.filter(p=>totalStock(p)>3).length,                                   c:"#22c55e",      filter:"instock"  },
        ].map(s => (
          <div key={s.label} onClick={() => setStockFilter(sf => sf===s.filter?"all":s.filter)}
            style={{ background:stockFilter===s.filter?"rgba(212,175,55,0.08)":"var(--bg-card)", border:`1px solid ${stockFilter===s.filter?"var(--gold-border)":"var(--border)"}`, borderRadius:"var(--radius-sm)", padding:"8px 14px", display:"flex", gap:"6px", alignItems:"baseline", cursor:"pointer", transition:"var(--transition)" }}>
            <span style={{ color:s.c, fontWeight:"800", fontSize:"16px" }}>{s.val}</span>
            <span style={{ color:"var(--text-muted)", fontSize:"11px" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {loading && <p style={{ color:"var(--text-muted)", textAlign:"center", padding:"40px" }}>جاري التحميل...</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color:"var(--text-muted)", textAlign:"center", marginTop:"40px" }}>لا توجد منتجات 📦</p>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:"14px" }}>
        {filtered.map(p => {
          const stock = totalStock(p);
          const soldOut = stock === 0;
          const lowStock = !soldOut && stock <= 3;
          return (
            <div key={p.id} style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"14px", overflow:"hidden", transition:"var(--transition)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="var(--gold-border)"}
              onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}>
              <div style={{ position:"relative" }}>
                {p.video ? (
                  <video src={p.video} autoPlay muted loop playsInline preload="metadata" style={{ width:"100%", height:"150px", objectFit:"cover" }} />
                ) : p.image ? (
                  <img src={p.image} alt={p.name} loading="lazy" style={{ width:"100%", height:"150px", objectFit:"cover" }} />
                ) : (
                  <div style={{ width:"100%", height:"150px", background:"#1a1a2a", display:"flex", alignItems:"center", justifyContent:"center", color:"#444" }}>لا صورة</div>
                )}
                <div style={{ position:"absolute", top:"6px", left:"6px", display:"flex", flexDirection:"column", gap:"3px" }}>
                  {soldOut  && <span style={{ background:"rgba(239,68,68,0.9)",  color:"white",  padding:"2px 7px", borderRadius:"5px", fontSize:"9px", fontWeight:"800" }}>نفذ</span>}
                  {lowStock && <span style={{ background:"rgba(245,158,11,0.9)", color:"#000",   padding:"2px 7px", borderRadius:"5px", fontSize:"9px", fontWeight:"800" }}>⚠️ {stock}</span>}
                  {p.isNew  && <span style={{ background:"rgba(34,197,94,0.9)",  color:"white",  padding:"2px 7px", borderRadius:"5px", fontSize:"9px", fontWeight:"800" }}>جديد</span>}
                  {p.isFeatured && <span style={{ background:"rgba(212,175,55,0.9)", color:"#000", padding:"2px 7px", borderRadius:"5px", fontSize:"9px", fontWeight:"800" }}>⭐</span>}
                </div>
                {getActiveDiscount(p) > 0 && (
                  <div style={{ position:"absolute", top:"6px", right:"6px", background:"rgba(239,68,68,0.9)", color:"white", padding:"2px 8px", borderRadius:"5px", fontSize:"9px", fontWeight:"800" }}>
                    -{getActiveDiscount(p)}%
                  </div>
                )}
              </div>
              <div style={{ padding:"11px" }}>
                <h4 style={{ color:"var(--gold)", margin:"0 0 3px", fontSize:"13px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</h4>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                  <p style={{ color:"var(--text-dim)", margin:0, fontSize:"12px", fontWeight:"700" }}>
                    {getActiveDiscount(p) > 0 ? (
                      <>
                        <span style={{ color:"#ef4444", textDecoration:"line-through", fontSize:"10px", marginLeft:"4px" }}>{p.price} BD</span>
                        <span>{getDiscountedPrice(p).toFixed(3)} BD</span>
                      </>
                    ) : `${p.price} BD`}
                  </p>
                  <span style={{ color: p.customizable?"#D4AF37":soldOut?"#ef4444":lowStock?"#f59e0b":"#22c55e", fontSize:"10px", fontWeight:"700" }}>
                    {p.customizable?"🎨 حسب الطلب":soldOut?"نفذ":lowStock?`⚠️ ${stock}`:`✅ ${stock}`}
                  </span>
                </div>
                <div style={{ display:"flex", gap:"5px" }}>
                  <button onClick={() => openEdit(p)} className="btn-3d"
                    style={{ flex:1, padding:"6px", background:"rgba(212,175,55,0.1)", color:"var(--gold)", border:"1px solid var(--gold-border)", borderRadius:"7px", cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>
                    ✏️ تعديل
                  </button>
                  <button onClick={() => handleDelete(p.id, p.name)} className="btn-3d"
                    style={{ flex:1, padding:"6px", background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"7px", cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>
                    🗑️ حذف
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Form Modal ── */}
      {showForm && createPortal(
        <>
          <div onClick={() => setShowForm(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(10px)", zIndex:500 }} />
          <div style={{ position:"fixed", inset:0, zIndex:501, overflowY:"auto", padding:"40px 16px" }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#0a0d1a", border:"1px solid rgba(212,175,55,0.25)", borderRadius:"22px", padding:"28px 24px", width:"100%", maxWidth:"560px", margin:"0 auto", direction:"rtl", boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }}>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"22px" }}>
                <h3 style={{ color:"var(--gold)", margin:0, fontSize:"16px", fontWeight:"800" }}>
                  {editId ? "✏️ تعديل المنتج" : "➕ إضافة منتج جديد"}
                </h3>
                <button onClick={() => setShowForm(false)} className="btn-3d"
                  style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:"50%", width:"30px", height:"30px", color:"var(--text-muted)", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>

                {/* Name */}
                <div>
                  <label style={lbl}>اسم المنتج *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: خاتم ذهبي فاخر" className="inp" />
                </div>

                {/* Price + Category */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                  <div>
                    <label style={lbl}>السعر (BD) *</label>
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.000" className="inp" dir="ltr" />
                  </div>
                  <div>
                    <label style={lbl}>الخصم (%)</label>
                    <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder="0" min="0" max="99" className="inp" dir="ltr" />
                  </div>
                </div>

                {/* ✅ تاريخ انتهاء الخصم — اختياري، يظهر بس لو فيه خصم مضبوط */}
                {Number(form.discount) > 0 && (
                  <div>
                    <label style={lbl}>ينتهي الخصم بتاريخ (اختياري — اتركيه فاضي لو بلا نهاية)</label>
                    <input type="date" value={form.discountEndsAt} onChange={e => setForm(f => ({ ...f, discountEndsAt: e.target.value }))} className="inp" dir="ltr" />
                  </div>
                )}

                <div>
                  <label style={lbl}>الفئة / القسم</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="inp" style={{ background:"#0B0F1A" }}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* أنواع السلسلة — تظهر بس لقسم "سلاسل"، كل نوع بسعره الخاص */}
                {form.category === "necklace" && (
                  <div>
                    <label style={lbl}>أنواع السلسلة (اختياري)</label>
                    <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"0 0 8px" }}>
                      لو ضفتِ أنواع هنا، العميل لازم يختار نوع قبل ما يضيف للسلة، والسعر يتحدد حسب النوع المختار (السعر الأساسي فوق يبين كـ"يبدأ من").
                    </p>
                    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                      {form.necklaceTypes.map((t, i) => (
                        <div key={i} style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                          <input value={t.name}
                            onChange={e => setForm(f => ({ ...f, necklaceTypes: f.necklaceTypes.map((v, idx) => idx === i ? { ...v, name: e.target.value } : v) }))}
                            placeholder="مثال: سلسلة فيدان" className="inp" style={{ flex:2 }} />
                          <input type="number" value={t.price}
                            onChange={e => setForm(f => ({ ...f, necklaceTypes: f.necklaceTypes.map((v, idx) => idx === i ? { ...v, price: e.target.value } : v) }))}
                            placeholder="السعر" className="inp" style={{ flex:1 }} dir="ltr" />
                          <button onClick={() => setForm(f => ({ ...f, necklaceTypes: f.necklaceTypes.filter((_, idx) => idx !== i) }))} className="btn-3d"
                            style={{ background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"7px", cursor:"pointer", fontSize:"12px", padding:"8px 10px", flexShrink:0 }}>🗑️</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setForm(f => ({ ...f, necklaceTypes: [...f.necklaceTypes, { name:"", price:"" }] }))} className="btn-3d"
                      style={{ marginTop:"8px", padding:"8px 14px", background:"rgba(184,150,46,0.08)", color:"var(--gold)", border:"1px solid var(--gold-border)", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"700" }}>
                      + إضافة نوع سلسلة
                    </button>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label style={lbl}>الوصف</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للمنتج..." rows={3} className="inp" style={{ resize:"vertical" }} />
                </div>

                {/* Image Upload */}
                {/* Multi-image gallery — one link per image, "+" adds another row */}
                <div>
                  <label style={lbl}>صور المنتج (اختياري لو مضبوط رابط فيديو تحت — رابط لكل صورة، اضغط + لإضافة رابط ثاني)</label>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"6px" }}>
                    {form.images.map((url, i) => {
                      const pageLinkWarning = isPageLinkNotDirect(url);
                      return (
                      <div key={i}>
                        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                          {url.trim() ? (
                            <img src={url} alt="" style={{ width:"40px", height:"40px", objectFit:"cover", borderRadius:"8px", border:"1px solid var(--gold-border)", flexShrink:0 }}
                              onError={e => (e.currentTarget.style.opacity="0.15")} />
                          ) : (
                            <div style={{ width:"40px", height:"40px", borderRadius:"8px", background:"rgba(255,255,255,0.04)", border:"1px dashed var(--border)", flexShrink:0 }} />
                          )}
                          <input value={url}
                            onChange={e => setForm(f => ({ ...f, images: f.images.map((v, idx) => idx === i ? e.target.value : v) }))}
                            placeholder="https://..." className="inp" style={{ flex:1, borderColor: pageLinkWarning ? "#f59e0b" : undefined }} dir="ltr" />
                          {i === 0 && <span style={{ background:"var(--gold-dim)", color:"var(--gold)", fontSize:"10px", fontWeight:"700", padding:"4px 8px", borderRadius:"6px", whiteSpace:"nowrap" }}>غلاف</span>}
                          <button onClick={() => setForm(f => ({ ...f, images: f.images.length > 1 ? f.images.filter((_, idx) => idx !== i) : [""] }))} className="btn-3d"
                            style={{ background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"7px", cursor:"pointer", fontSize:"12px", padding:"8px 10px", flexShrink:0 }}>🗑️</button>
                        </div>
                        {pageLinkWarning && (
                          <p style={{ color:"#f59e0b", fontSize:"11px", margin:"4px 0 0 48px" }}>
                            ⚠️ هذا رابط صفحة العرض مو رابط الصورة المباشر — {pageLinkWarning}
                          </p>
                        )}
                      </div>
                    );})}
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, images: [...f.images, ""] }))} className="btn-3d"
                    style={{ marginTop:"8px", padding:"8px 14px", background:"rgba(184,150,46,0.08)", color:"var(--gold)", border:"1px solid var(--gold-border)", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"700" }}>
                    + إضافة رابط صورة
                  </button>
                </div>

                {/* Video URL */}
                <div>
                  <label style={lbl}>رابط الفيديو (اختياري)</label>
                  <input value={form.video} onChange={e => setForm(f => ({ ...f, video: e.target.value }))} placeholder="https://... (mp4)" className="inp" dir="ltr" />
                </div>

                {/* Badges */}
                <div>
                  <label style={lbl}>علامات المنتج</label>
                  <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginTop:"6px" }}>
                    {[
                      { key:"isNew", label:"✨ منتج جديد" },
                      { key:"isFeatured", label:"⭐ مميز" },
                    ].map(badge => (
                      <button key={badge.key} className="btn-3d"
                        onClick={() => setForm(f => ({ ...f, [badge.key]: !(f as any)[badge.key] }))}
                        style={{ padding:"8px 16px", borderRadius:"99px", border:`1.5px solid ${(form as any)[badge.key]?"var(--gold)":"var(--border)"}`, background:(form as any)[badge.key]?"var(--gold)":"transparent", color:(form as any)[badge.key]?"#000":"var(--text-muted)", cursor:"pointer", fontSize:"12px", fontWeight:"700", fontFamily:"inherit", transition:"var(--transition)" }}>
                        {badge.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* الجنس — اختياري، لو ما اخترتِ شي يعتبر للجميع */}
                <div>
                  <label style={lbl}>الفئة (اختياري — اتركيه فاضي لو للجميع)</label>
                  <div style={{ display:"flex", gap:"8px", marginTop:"6px" }}>
                    {[
                      { value:"", label:"للجميع" },
                      { value:"female", label:" نسائي" },
                      { value:"male", label:" رجالي" },
                      { value:"kids", label:"👶 أطفال" },
                    ].map(g => (
                      <button key={g.value} onClick={() => setForm(f => ({ ...f, gender: g.value as any }))} className="btn-3d"
                        style={{ flex:1, padding:"9px 8px", borderRadius:"var(--radius-sm)", border:`2px solid ${form.gender===g.value?"var(--gold)":"var(--border)"}`, background:form.gender===g.value?"var(--gold-dim)":"transparent", color:form.gender===g.value?"var(--gold)":"var(--text-muted)", cursor:"pointer", fontSize:"12px", fontWeight:"700", fontFamily:"inherit", transition:"var(--transition)" }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>الكمية الإجمالية</label>
                  <input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="inp" dir="ltr" />
                </div>

                <p style={{ color:"var(--text-muted)", fontSize:"11px", background:"rgba(184,150,46,0.04)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius-sm)", padding:"10px 12px" }}>
                  💡 خدمة صياغة حسب الطلب (النقش والصور المخصصة) تُدار الآن من قسم <strong style={{ color:"var(--gold)" }}>🎨 الصياغة حسب الطلب</strong> في القائمة الجانبية.
                </p>
              </div>

              <div style={{ display:"flex", gap:"10px", marginTop:"22px" }}>
                <button onClick={handleSave} disabled={saving} className="btn-gold"
                  style={{ flex:1, padding:"13px", fontSize:"14px", opacity:saving?0.6:1, cursor:saving?"not-allowed":"pointer" }}>
                  {saving ? "جاري الحفظ..." : editId ? "💾 حفظ التعديلات" : "✨ إضافة المنتج"}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-ghost" style={{ padding:"13px 20px" }}>إلغاء</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

const lbl: React.CSSProperties = {
  color:"var(--text-muted)", fontSize:"12px", marginBottom:"4px", display:"block",
};
