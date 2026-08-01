import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { useToast } from "./Toast";

const CATEGORIES = [
  { value: "rings",    label: "💍 خواتم" },
  { value: "necklace", label: "📿 سلاسل" },
  { value: "bracelet", label: "💫 أساور" },
  { value: "other",    label: "✨ أخرى" },
];

const RING_SIZES = ["15","16","17","18","19","20","21","22","23","24","25"];

export type CustomField = { label: string; required: boolean };

const emptyForm = {
  name: "", price: "", category: "rings", description: "",
  image: "", video: "",
  hasSizes: true,
  sizes: Object.fromEntries(RING_SIZES.map(s => [s, "0"])),  // مقاسات 15-25
  quantity: "0",
  isNew: false,
  isFeatured: false,
  discount: "",
};

// ── Image Upload Component ──────────────────────────────────
export function ImageUploader({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [uploading, setUploading]   = useState(false);
  const [progress,  setProgress]    = useState(0);
  const [dragOver,  setDragOver]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("الرجاء اختيار صورة فقط"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("الحجم الأقصى 5MB"); return; }

    setUploading(true);
    setProgress(0);

    const fileName = `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._]/g, "_")}`;
    const storageRef = ref(storage, fileName);
    const task = uploadBytesResumable(storageRef, file);

    task.on("state_changed",
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err  => { console.error(err); setUploading(false); alert("فشل رفع الصورة"); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange(url);
        setUploading(false);
        setProgress(0);
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div>
      <label style={{ color:"var(--text-muted)", fontSize:"12px", display:"block", marginBottom:"6px" }}>{label}</label>

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${dragOver ? "var(--gold)" : value ? "var(--gold-border)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: value ? "8px" : "24px 16px",
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          background: dragOver ? "rgba(212,175,55,0.05)" : "rgba(255,255,255,0.02)",
          transition: "var(--transition)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {uploading ? (
          <div>
            <div style={{ width:"100%", height:"4px", background:"var(--border)", borderRadius:"99px", marginBottom:"8px" }}>
              <div style={{ width:`${progress}%`, height:"100%", background:"var(--gold)", borderRadius:"99px", transition:"width 0.2s ease" }} />
            </div>
            <p style={{ color:"var(--gold)", fontSize:"13px", margin:0 }}>⬆️ جاري الرفع... {progress}%</p>
          </div>
        ) : value ? (
          <div style={{ position:"relative", display:"inline-block" }}>
            <img src={value} alt="preview"
              style={{ height:"110px", maxWidth:"100%", objectFit:"cover", borderRadius:"10px", display:"block" }}
              onError={e => (e.currentTarget.style.display="none")}
            />
            <button
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="btn-3d"
              style={{ position:"absolute", top:"-6px", right:"-6px", background:"#ef4444", border:"none", borderRadius:"50%", width:"22px", height:"22px", color:"white", cursor:"pointer", fontSize:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold" }}
            >×</button>
            <p style={{ color:"var(--text-muted)", fontSize:"11px", marginTop:"6px" }}>اضغط لتغيير الصورة</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize:"32px", marginBottom:"8px" }}>🖼️</div>
            <p style={{ color:"var(--text-muted)", fontSize:"13px", margin:"0 0 4px" }}>اسحب صورة هنا أو اضغط للاختيار</p>
            <p style={{ color:"rgba(100,116,139,0.6)", fontSize:"11px", margin:0 }}>JPG, PNG, WEBP — حد أقصى 5MB</p>
          </>
        )}
      </div>

      {/* Or URL input */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"8px" }}>
        <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
        <span style={{ color:"var(--text-muted)", fontSize:"11px" }}>أو رابط مباشر</span>
        <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
      </div>
      <input
        value={value.startsWith("http") && !value.includes("firebasestorage") ? value : ""}
        onChange={e => onChange(e.target.value)}
        placeholder="https://..."
        style={{ width:"100%", padding:"9px 12px", marginTop:"6px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border)", background:"var(--bg-input)", color:"var(--text)", fontSize:"12px", boxSizing:"border-box", outline:"none", boxShadow:"inset 0 2px 5px rgba(0,0,0,0.3)" }}
        dir="ltr"
      />

      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function ManageProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState({ ...emptyForm });
  const [search, setSearch]     = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const { showToast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "products"));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { showToast("خطأ في التحميل", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...emptyForm, sizes: Object.fromEntries(RING_SIZES.map(s => [s, "0"])) });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    const hasSizes = !!p.sizes && typeof p.sizes === "object";
    setForm({
      name: p.name || "",
      price: String(p.price || ""),
      category: p.category || "rings",
      description: p.description || "",
      image: p.image || "",
      video: p.video || "",
      hasSizes,
      sizes: hasSizes
        ? { ...Object.fromEntries(RING_SIZES.map(s => [s, "0"])), ...Object.fromEntries(Object.entries(p.sizes).map(([k,v]) => [k, String(v)])) }
        : Object.fromEntries(RING_SIZES.map(s => [s, "0"])),
      quantity: hasSizes ? "0" : String(p.quantity || "0"),
      isNew: !!p.isNew,
      isFeatured: !!p.isFeatured,
      discount: String(p.discount || ""),
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("أدخل اسم المنتج", "warning"); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      showToast("أدخل سعراً صحيحاً", "warning"); return;
    }
    if (!form.image.trim() && !form.video.trim()) {
      showToast("أدخل صورة أو رابط فيديو", "warning"); return;
    }

    const data: any = {
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      description: form.description.trim(),
      image: form.image.trim(),
      video: form.video.trim(),
      isNew: form.isNew,
      isFeatured: form.isFeatured,
      discount: form.discount ? Number(form.discount) : 0,
    };

    if (form.hasSizes) {
      data.sizes = Object.fromEntries(Object.entries(form.sizes).map(([k, v]) => [k, Number(v) || 0]));
      delete data.quantity;
    } else {
      data.quantity = Number(form.quantity) || 0;
      delete data.sizes;
    }

    try {
      setSaving(true);
      if (editId) {
        await updateDoc(doc(db, "products", editId), data);
        showToast("تم التحديث ✅", "success");
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
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

  const totalStock = (p: any) => p.sizes
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
                  <video src={p.video} muted loop style={{ width:"100%", height:"150px", objectFit:"cover" }} />
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
                {p.discount > 0 && (
                  <div style={{ position:"absolute", top:"6px", right:"6px", background:"rgba(239,68,68,0.9)", color:"white", padding:"2px 8px", borderRadius:"5px", fontSize:"9px", fontWeight:"800" }}>
                    -{p.discount}%
                  </div>
                )}
              </div>
              <div style={{ padding:"11px" }}>
                <h4 style={{ color:"var(--gold)", margin:"0 0 3px", fontSize:"13px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</h4>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                  <p style={{ color:"var(--text-dim)", margin:0, fontSize:"12px", fontWeight:"700" }}>
                    {p.discount > 0 ? (
                      <>
                        <span style={{ color:"#ef4444", textDecoration:"line-through", fontSize:"10px", marginLeft:"4px" }}>{p.price} BD</span>
                        <span>{(p.price * (1 - p.discount/100)).toFixed(3)} BD</span>
                      </>
                    ) : `${p.price} BD`}
                  </p>
                  <span style={{ color: soldOut?"#ef4444":lowStock?"#f59e0b":"#22c55e", fontSize:"10px", fontWeight:"700" }}>
                    {soldOut?"نفذ":lowStock?`⚠️ ${stock}`:`✅ ${stock}`}
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

                <div>
                  <label style={lbl}>الفئة / القسم</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, hasSizes: e.target.value === "rings" }))} className="inp" style={{ background:"#0B0F1A" }}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={lbl}>الوصف</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للمنتج..." rows={3} className="inp" style={{ resize:"vertical" }} />
                </div>

                {/* Image Upload */}
                <ImageUploader
                  label="صورة المنتج *"
                  value={form.image}
                  onChange={url => setForm(f => ({ ...f, image: url }))}
                />

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

                {/* Stock type — sizes only apply to rings */}
                {form.category === "rings" && (
                  <div style={{ display:"flex", gap:"10px" }}>
                    {[true, false].map(v => (
                      <button key={String(v)} onClick={() => setForm(f => ({ ...f, hasSizes: v }))} className="btn-3d"
                        style={{ flex:1, padding:"10px", borderRadius:"var(--radius-sm)", border:`2px solid ${form.hasSizes===v?"var(--gold)":"var(--border)"}`, background:form.hasSizes===v?"var(--gold-dim)":"transparent", color:form.hasSizes===v?"var(--gold)":"var(--text-muted)", cursor:"pointer", fontSize:"13px", fontWeight:"700", fontFamily:"inherit", transition:"var(--transition)" }}>
                        {v ? "💍 بمقاسات" : "📦 بكمية فقط"}
                      </button>
                    ))}
                  </div>
                )}

                {form.category === "rings" && form.hasSizes ? (
                  <div>
                    <label style={lbl}>كميات المقاسات</label>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"8px", marginTop:"6px" }}>
                      {RING_SIZES.map(size => (
                        <div key={size} style={{ textAlign:"center" }}>
                          <div style={{ color:"var(--text-muted)", fontSize:"11px", marginBottom:"4px" }}>{size}</div>
                          <input type="number" min="0" value={form.sizes[size]}
                            onChange={e => setForm(f => ({ ...f, sizes: { ...f.sizes, [size]: e.target.value } }))}
                            className="inp" style={{ padding:"7px", textAlign:"center", fontSize:"13px" }} dir="ltr"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>الكمية الإجمالية</label>
                    <input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="inp" dir="ltr" />
                  </div>
                )}

                <p style={{ color:"var(--text-muted)", fontSize:"11px", background:"rgba(184,150,46,0.04)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius-sm)", padding:"10px 12px" }}>
                  💡 خدمة التخصيص (النقش والصور المخصصة) تُدار الآن من قسم <strong style={{ color:"var(--gold)" }}>🎨 التخصيص</strong> في القائمة الجانبية.
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
