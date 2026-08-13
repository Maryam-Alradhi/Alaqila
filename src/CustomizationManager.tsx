import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";
import { type CustomField } from "./ManageProducts";

// ✅ التخصيص يقتصر على الأنواع اللي فيها خدمة تخصيص فعلية
const CATEGORIES = [
  { value: "rings",    label: "💍 خاتم" },
  { value: "brooch",   label: "📌 بروش" },
  { value: "bracelet", label: "💫 أساور" },
];

// ✅ حقول جاهزة تلقائياً حسب النوع — الأدمن ما يحتاج يبنيها يدوياً
const PRESET_FIELDS: Record<string, CustomField[]> = {
  rings: [
    { label: "النقش المطلوب", required: true },
    { label: "تاريخ الزواج",  required: false },
  ],
  brooch: [
    { label: "الاسم المطلوب على البروش", required: true },
  ],
  bracelet: [
    { label: "النقش المطلوب", required: true },
    { label: "مقاس السوار",   required: false },
  ],
};

const emptyForm = {
  name: "", price: "", category: "rings", description: "",
  images: [""] as string[],
  video: "",
  customFields: PRESET_FIELDS.rings.map(f => ({ ...f })),
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

export default function CustomizationManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState({ ...emptyForm });
  const { showToast } = useToast();

  // ✅ Only ever shows products actually flagged customizable — starts empty until the admin adds one here
  const load = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "products"));
      const all: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(all.filter(p => p.customizable));
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
    setForm({
      name: p.name || "",
      price: String(p.price || ""),
      category: p.category || "rings",
      description: p.description || "",
      images: Array.isArray(p.images) && p.images.length ? [...p.images] : (p.image ? [p.image] : [""]),
      video: p.video || "",
      customFields: Array.isArray(p.customFields) ? p.customFields.map((f: any) => ({ label: f.label || "", required: !!f.required })) : [],
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("أدخل اسم المنتج", "warning"); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      showToast("أدخل سعراً صحيحاً", "warning"); return;
    }
    if (form.images.map(s => s.trim()).filter(Boolean).length === 0) { showToast("أضف رابط صورة واحد على الأقل", "warning"); return; }
    if (form.customFields.filter(f => f.label.trim()).length === 0) { showToast("أضف حقل تخصيص واحد على الأقل", "warning"); return; }

    const images = form.images.map(s => s.trim()).filter(Boolean);
    const data = {
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      description: form.description.trim(),
      image: images[0],
      images,
      video: form.video.trim(),
      customizable: true,
      customFields: form.customFields.filter(f => f.label.trim()).map(f => ({ label: f.label.trim(), required: !!f.required })),
      // مصنوع حسب الطلب — ما يخضع لمخزون حقيقي، رقم كبير حتى ما يظهر "نفذ من المخزون"
      quantity: 999,
    };

    try {
      setSaving(true);
      if (editId) {
        await updateDoc(doc(db, "products", editId), data);
        showToast("تم التحديث ✅", "success");
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
        showToast("تمت إضافة المنتج المخصص 🎉", "success");
      }
      closeForm();
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

  return (
    <div>
      <div style={{ display:"flex", gap:"10px", marginBottom:"18px", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
        <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:0, maxWidth:"460px" }}>
          🎨 هنا تسوي منتجات مخصصة من الصفر — للعميل يشوف أكثر من صورة (زوايا مختلفة) ويعبّي حقول خاصة (نقش، مقاس، اسم...). الصفحة تبقى فاضية لين تضيف أول منتج.
        </p>
        <button onClick={openAdd} className="btn-gold" style={{ padding:"10px 20px", fontSize:"13px", whiteSpace:"nowrap" }}>
          + إضافة منتج مخصص
        </button>
      </div>

      {loading && <p style={{ color:"var(--text-muted)", textAlign:"center", padding:"40px" }}>جاري التحميل...</p>}
      {!loading && products.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", border:"1px dashed var(--gold-border)", borderRadius:"var(--radius-lg)" }}>
          <div style={{ fontSize:"42px", marginBottom:"10px" }}>🎨</div>
          <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>لا توجد منتجات مخصصة بعد — اضغط "+ إضافة منتج مخصص" لإنشاء أول واحد</p>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:"14px" }}>
        {products.map(p => (
          <div key={p.id} style={{ background:"var(--bg-card)", border:"1px solid var(--gold-border)", borderRadius:"14px", overflow:"hidden", transition:"var(--transition)" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="var(--gold)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="var(--gold-border)"}>
            <div style={{ position:"relative" }}>
              {p.image ? (
                <img src={p.image} alt={p.name} loading="lazy" style={{ width:"100%", height:"140px", objectFit:"cover" }} />
              ) : (
                <div style={{ width:"100%", height:"140px", background:"#1a1a2a", display:"flex", alignItems:"center", justifyContent:"center", color:"#444" }}>لا صورة</div>
              )}
              {Array.isArray(p.images) && p.images.length > 1 && (
                <div style={{ position:"absolute", top:"6px", left:"6px", background:"rgba(0,0,0,0.7)", color:"white", padding:"2px 8px", borderRadius:"6px", fontSize:"10px", fontWeight:"700" }}>
                  🖼️ {p.images.length} صور
                </div>
              )}
              <div style={{ position:"absolute", top:"6px", right:"6px", background:"rgba(184,150,46,0.92)", color:"#000", padding:"3px 9px", borderRadius:"6px", fontSize:"10px", fontWeight:"800" }}>🎨 صياغة</div>
            </div>
            <div style={{ padding:"11px" }}>
              <h4 style={{ color:"var(--gold)", margin:"0 0 3px", fontSize:"13px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</h4>
              <p style={{ color:"var(--text-muted)", margin:"0 0 8px", fontSize:"11px" }}>{(p.customFields||[]).length} حقل تخصيص · {p.price} BD</p>
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
        ))}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showForm && createPortal(
        <>
          <div onClick={closeForm}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(10px)", zIndex:500 }} />
          <div style={{ position:"fixed", inset:0, zIndex:501, overflowY:"auto", padding:"40px 16px" }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#0a0d1a", border:"1px solid rgba(212,175,55,0.25)", borderRadius:"22px", padding:"28px 24px", width:"100%", maxWidth:"560px", margin:"0 auto", direction:"rtl", boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }}>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"22px" }}>
                <h3 style={{ color:"var(--gold)", margin:0, fontSize:"16px", fontWeight:"800" }}>
                  {editId ? "✏️ تعديل منتج مخصص" : "🎨 إضافة منتج مخصص جديد"}
                </h3>
                <button onClick={closeForm} className="btn-3d"
                  style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:"50%", width:"30px", height:"30px", color:"var(--text-muted)", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                <div>
                  <label style={lbl}>اسم المنتج *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: خاتم مخصص بالنقش" className="inp" />
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                  <div>
                    <label style={lbl}>السعر (BD) *</label>
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.000" className="inp" dir="ltr" />
                  </div>
                  <div>
                    <label style={lbl}>النوع</label>
                    <select value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value, customFields: PRESET_FIELDS[e.target.value].map(field => ({ ...field })) }))}
                      className="inp" style={{ background:"#0B0F1A" }}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={lbl}>الوصف</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للمنتج..." rows={3} className="inp" style={{ resize:"vertical" }} />
                </div>

                {/* Multi-image gallery — one link per image, "+" adds another row */}
                <div>
                  <label style={lbl}>صور المنتج * (رابط لكل صورة — زوايا مختلفة، اضغط + لإضافة رابط ثاني)</label>
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

                {/* Video — separate field, mp4/video links go here, not in the image list */}
                <div>
                  <label style={lbl}>رابط فيديو (اختياري — لملفات mp4، لا تحطه في خانات الصور)</label>
                  <input value={form.video} onChange={e => setForm(f => ({ ...f, video: e.target.value }))} placeholder="https://... (mp4)" className="inp" dir="ltr" />
                  {form.video.trim() && (
                    <p style={{ color:"var(--text-muted)", fontSize:"11px", marginTop:"4px" }}>
                      ملاحظة: إذا حطيت فيديو، بيظهر هو بدل معرض الصور في صفحة المنتج.
                    </p>
                  )}
                </div>

                {/* Custom fields — auto-filled by type, editable/extendable */}
                <div>
                  <label style={lbl}>حقول التخصيص (تُملأ تلقائياً حسب النوع، وتقدر تعدّلها أو تضيف عليها)</label>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"6px" }}>
                    {form.customFields.map((field, i) => (
                      <div key={i} style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                        <input value={field.label}
                          onChange={e => setForm(f => ({ ...f, customFields: f.customFields.map((cf, idx) => idx === i ? { ...cf, label: e.target.value } : cf) }))}
                          placeholder="مثال: مقاس الخاتم" className="inp" style={{ flex:1 }} />
                        <label style={{ display:"flex", alignItems:"center", gap:"4px", color:"var(--text-muted)", fontSize:"11px", whiteSpace:"nowrap", cursor:"pointer" }}>
                          <input type="checkbox" checked={field.required}
                            onChange={e => setForm(f => ({ ...f, customFields: f.customFields.map((cf, idx) => idx === i ? { ...cf, required: e.target.checked } : cf) }))} />
                          إلزامي
                        </label>
                        <button onClick={() => setForm(f => ({ ...f, customFields: f.customFields.filter((_, idx) => idx !== i) }))} className="btn-3d"
                          style={{ background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"7px", cursor:"pointer", fontSize:"12px", padding:"7px 10px" }}>🗑️</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, customFields: [...f.customFields, { label:"", required:true }] }))} className="btn-3d"
                    style={{ marginTop:"8px", padding:"8px 14px", background:"rgba(184,150,46,0.08)", color:"var(--gold)", border:"1px solid var(--gold-border)", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"700" }}>
                    + إضافة حقل
                  </button>
                </div>

                <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:0 }}>
                  💡 "خاتم" يضيف تلقائياً "النقش المطلوب" (إلزامي) و"تاريخ الزواج" (اختياري).
                  "بروش" يضيف "الاسم المطلوب على البروش" (إلزامي).
                  "أساور" يضيف "النقش المطلوب" (إلزامي) و"مقاس السوار" (اختياري).
                </p>
              </div>

              <div style={{ display:"flex", gap:"10px", marginTop:"22px" }}>
                <button onClick={handleSave} disabled={saving} className="btn-gold"
                  style={{ flex:1, padding:"13px", fontSize:"14px", opacity:saving?0.6:1, cursor:saving?"not-allowed":"pointer" }}>
                  {saving ? "جاري الحفظ..." : editId ? "💾 حفظ التعديلات" : "✨ إضافة المنتج"}
                </button>
                <button onClick={closeForm} className="btn-ghost" style={{ padding:"13px 20px" }}>إلغاء</button>
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
