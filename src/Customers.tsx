import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs, doc, updateDoc, increment, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";

export default function Customers() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState<any|null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addNote,   setAddNote]   = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [usersSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "orders"), orderBy("createdAt","desc"))),
      ]);
      const allOrders: any[] = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const users = usersSnap.docs.map(d => {
        const u = { id: d.id, ...d.data() } as any;
        const uOrders = allOrders.filter(o => o.userId === u.uid);
        u.orderCount    = uOrders.length;
        u.totalSpent    = uOrders.filter(o => o.status!=="rejected").reduce((s:number,o:any)=>s+(o.total||0),0);
        u.lastOrderDate = uOrders[0]?.createdAt?.toDate?.() || null;
        return u;
      });
      setCustomers(users);
    } catch { showToast("خطأ في التحميل","error"); }
    finally { setLoading(false); }
  };

  const handleAddBalance = async () => {
    if (!selected) return;
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount === 0) { showToast("أدخل مبلغاً صحيحاً","warning"); return; }
    try {
      setSaving(true);
      await updateDoc(doc(db,"users",selected.uid), { balance: increment(amount) });
      showToast(`تم ${amount>0?"إضافة":"خصم"} ${Math.abs(amount).toFixed(3)} BD ${amount>0?"✅":""}`, "success");
      setSelected(null); setAddAmount(""); setAddNote("");
      load();
    } catch { showToast("فشل التحديث","error"); }
    finally { setSaving(false); }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  if (loading) return <div style={{ textAlign:"center", padding:"40px", color:"var(--text-muted)" }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:"10px", marginBottom:"18px" }}>
        <input className="inp" placeholder="🔍 بحث بالاسم أو الإيميل أو الهاتف..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex:1 }} />
        <button onClick={load} className="btn-3d"
          style={{ padding:"10px 14px", background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", color:"var(--text-muted)", cursor:"pointer" }}>🔄</button>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:"10px", marginBottom:"18px" }}>
        {[
          { label:"إجمالي العملاء", val:customers.length, icon:"👥", c:"#3b82f6" },
          { label:"طلبوا مسبقاً", val:customers.filter(c=>c.orderCount>0).length, icon:"🛒", c:"#22c55e" },
          { label:"إجمالي الرصيد", val:customers.reduce((s,c)=>s+(c.balance||0),0).toFixed(3)+" BD", icon:"💰", c:"#D4AF37" },
        ].map(s => (
          <div key={s.label} style={{ background:"var(--bg-card)", border:`1px solid ${s.c}22`, borderRadius:"var(--radius)", padding:"14px", textAlign:"center" }}>
            <div style={{ fontSize:"22px" }}>{s.icon}</div>
            <div style={{ color:s.c, fontSize:"18px", fontWeight:"800" }}>{s.val}</div>
            <div style={{ color:"var(--text-muted)", fontSize:"11px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Customers list */}
      {filtered.length === 0 ? (
        <p style={{ textAlign:"center", color:"var(--text-muted)", padding:"40px" }}>لا يوجد عملاء مطابقون</p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {filtered.map(c => (
            <div key={c.id} className="card" style={{ padding:"14px 16px" }}>
              <div style={{ display:"flex", gap:"12px", alignItems:"center", flexWrap:"wrap" }}>
                {/* Avatar */}
                <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:"linear-gradient(135deg,#D4AF37,#a07020)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"900", color:"#000", flexShrink:0 }}>
                  {(c.name||c.email||"؟")[0].toUpperCase()}
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:"var(--text)", fontWeight:"700", fontSize:"14px", margin:0 }}>{c.name||"بدون اسم"}</p>
                  <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"2px 0 0" }}>{c.email}</p>
                  {c.phone && <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"1px 0 0" }}>📞 {c.phone}</p>}
                </div>
                {/* Stats */}
                <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:"var(--gold)", fontWeight:"800", fontSize:"15px" }}>{c.orderCount}</div>
                    <div style={{ color:"var(--text-muted)", fontSize:"10px" }}>طلب</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:"#22c55e", fontWeight:"800", fontSize:"14px" }}>{c.totalSpent.toFixed(3)}</div>
                    <div style={{ color:"var(--text-muted)", fontSize:"10px" }}>BD</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:"#a78bfa", fontWeight:"800", fontSize:"14px" }}>{(c.balance||0).toFixed(3)}</div>
                    <div style={{ color:"var(--text-muted)", fontSize:"10px" }}>رصيد</div>
                  </div>
                  <button onClick={() => { setSelected(c); setAddAmount(""); setAddNote(""); }} className="btn-3d"
                    style={{ padding:"6px 12px", background:"var(--gold-dim)", border:"1px solid var(--gold-border)", borderRadius:"8px", color:"var(--gold)", cursor:"pointer", fontSize:"11px", fontWeight:"700", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                    💰 شحن رصيد
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Balance modal */}
      {selected && createPortal(
        <>
          <div onClick={() => setSelected(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)", zIndex:500 }} />
          <div style={{ position:"fixed", inset:0, zIndex:501, overflowY:"auto", padding:"40px 20px" }}>
            <div onClick={e => e.stopPropagation()} className="animate-scaleIn"
              style={{ background:"var(--bg-2)", border:"1px solid var(--gold-border)", borderRadius:"24px", padding:"28px", width:"100%", maxWidth:"380px", margin:"0 auto", direction:"rtl", boxShadow:"0 24px 60px rgba(0,0,0,0.7)" }}>
              <div style={{ textAlign:"center", marginBottom:"20px" }}>
                <div style={{ width:"50px", height:"50px", borderRadius:"50%", background:"linear-gradient(135deg,#D4AF37,#a07020)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", fontWeight:"900", color:"#000", margin:"0 auto 12px" }}>
                  {(selected.name||"؟")[0].toUpperCase()}
                </div>
                <h3 style={{ color:"var(--text)", fontSize:"16px", margin:0 }}>{selected.name}</h3>
                <p style={{ color:"var(--text-muted)", fontSize:"12px", marginTop:"4px" }}>
                  الرصيد الحالي: <span style={{ color:"var(--gold)", fontWeight:"700" }}>{(selected.balance||0).toFixed(3)} BD</span>
                </p>
              </div>

              <label style={{ color:"var(--text-muted)", fontSize:"12px", display:"block", marginBottom:"6px" }}>
                المبلغ (سالب للخصم)
              </label>
              <input className="inp" type="number" value={addAmount}
                onChange={e => setAddAmount(e.target.value)} placeholder="مثال: 5 أو -2" dir="ltr" style={{ marginBottom:"12px" }} />
              <label style={{ color:"var(--text-muted)", fontSize:"12px", display:"block", marginBottom:"6px" }}>ملاحظة (اختياري)</label>
              <input className="inp" value={addNote} onChange={e => setAddNote(e.target.value)} placeholder="سبب التعديل..." style={{ marginBottom:"20px" }} />

              <div style={{ display:"flex", gap:"10px" }}>
                <button onClick={handleAddBalance} disabled={saving} className="btn-gold" style={{ flex:1, opacity:saving?0.6:1 }}>
                  {saving ? "جاري..." : "✅ تأكيد"}
                </button>
                <button onClick={() => setSelected(null)} className="btn-ghost" style={{ flex:1 }}>إلغاء</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
