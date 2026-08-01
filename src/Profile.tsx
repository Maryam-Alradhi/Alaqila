import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useToast } from "./Toast";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { useEffect } from "react";

export default function Profile() {
  const { user, profile, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name,    setName]    = useState(profile?.name    || "");
  const [phone,   setPhone]   = useState(profile?.phone   || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState<"profile"|"balance">("profile");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading,    setTxLoading]    = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (profile) { setName(profile.name||""); setPhone(profile.phone||""); setAddress(profile.address||""); }
  }, [profile]);

  useEffect(() => {
    if (tab !== "balance" || !user) return;
    setTxLoading(true);
    const q = query(collection(db,"loyaltyTransactions"), where("userId","==",user.uid), orderBy("createdAt","desc"), limit(20));
    getDocs(q).then(snap => setTransactions(snap.docs.map(d => ({ id:d.id, ...d.data() })))).catch(()=>{}).finally(()=>setTxLoading(false));
  }, [tab, user]);

  const handleSave = async () => {
    if (!name.trim()) { showToast("أدخل اسمك", "warning"); return; }
    try {
      setSaving(true);
      await updateUserProfile({ name: name.trim(), phone: phone.trim(), address: address.trim() });
      showToast("تم حفظ التعديلات ✅", "success");
    } catch { showToast("فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  if (!user) return null;

  const initial = (profile?.name || user.email || "؟")[0].toUpperCase();
  const balance = profile?.balance || 0;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", padding:"32px 16px", direction:"rtl" }}>
      <div style={{ maxWidth:"520px", margin:"0 auto" }}>

        {/* Header */}
        <div className="card animate-fadeIn" style={{ textAlign:"center", padding:"28px 20px", marginBottom:"16px" }}>
          <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:"linear-gradient(135deg,#D4AF37,#a07020)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", fontWeight:"900", color:"#000", margin:"0 auto 12px", boxShadow:"0 8px 24px rgba(212,175,55,0.35)" }}>
            {initial}
          </div>
          <h2 style={{ color:"var(--text)", fontSize:"18px", fontWeight:"800", margin:"0 0 4px" }}>{profile?.name || "مستخدم"}</h2>
          <p style={{ color:"var(--text-muted)", fontSize:"13px", margin:"0 0 16px" }}>{user.email}</p>

          {/* Balance card */}
          <div style={{ background:"linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))", border:"1px solid var(--gold-border)", borderRadius:"var(--radius)", padding:"14px 20px", display:"inline-flex", alignItems:"center", gap:"12px", cursor:"pointer" }}
            onClick={() => setTab("balance")}>
            <div style={{ fontSize:"28px" }}>💰</div>
            <div style={{ textAlign:"right" }}>
              <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"0 0 2px" }}>رصيدك</p>
              <p style={{ color:"var(--gold)", fontSize:"22px", fontWeight:"900", margin:0, lineHeight:1 }}>{balance.toFixed(3)} <span style={{ fontSize:"13px" }}>BD</span></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"6px", marginBottom:"16px" }}>
          {[
            { key:"profile", label:"👤 ملفي الشخصي" },
            { key:"balance", label:"💰 رصيدي ومكافآتي" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} className="btn-3d"
              style={{ flex:1, padding:"10px", borderRadius:"var(--radius-sm)", border:`1px solid ${tab===t.key?"var(--gold)":"var(--border)"}`, background:tab===t.key?"var(--gold-dim)":"transparent", color:tab===t.key?"var(--gold)":"var(--text-muted)", cursor:"pointer", fontSize:"13px", fontWeight:tab===t.key?"700":"400", fontFamily:"inherit", transition:"var(--transition)" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === "profile" && (
          <div className="card animate-fadeIn" style={{ padding:"22px" }}>
            <p className="section-title">تعديل المعلومات</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)" }}>👤</span>
                <input className="inp" placeholder="الاسم الكامل" value={name} onChange={e => setName(e.target.value)} style={{ paddingRight:"42px" }} />
              </div>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)" }}>📞</span>
                <input className="inp" placeholder="رقم الهاتف" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" style={{ paddingRight:"42px" }} />
              </div>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", top:"14px", right:"14px" }}>📍</span>
                <textarea className="inp" placeholder="العنوان الافتراضي" value={address} onChange={e => setAddress(e.target.value)} rows={2} style={{ paddingRight:"42px", resize:"vertical" }} />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-gold" style={{ width:"100%", opacity:saving?0.6:1 }}>
                {saving ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
              </button>
            </div>

            <div style={{ borderTop:"1px solid var(--border)", marginTop:"20px", paddingTop:"16px", display:"flex", gap:"10px", flexWrap:"wrap" }}>
              <button onClick={() => navigate("/orders")} className="btn-ghost" style={{ flex:1, fontSize:"13px", padding:"10px" }}>
                📦 طلباتي
              </button>
              <button onClick={() => navigate("/shop")} className="btn-ghost" style={{ flex:1, fontSize:"13px", padding:"10px" }}>
                🛍️ المتجر
              </button>
              <button onClick={async () => { await logout(); navigate("/"); }} className="btn-3d"
                style={{ flex:1, padding:"10px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"var(--radius-sm)", color:"#ef4444", cursor:"pointer", fontSize:"13px", fontWeight:"700", fontFamily:"inherit" }}>
                🚪 خروج
              </button>
            </div>
          </div>
        )}

        {/* Balance tab */}
        {tab === "balance" && (
          <div className="animate-fadeIn">
            {/* Balance summary */}
            <div className="card" style={{ padding:"20px", marginBottom:"14px" }}>
              <p className="section-title">💰 رصيدي الحالي</p>
              <div style={{ display:"flex", alignItems:"center", gap:"16px", padding:"14px", background:"linear-gradient(135deg,rgba(212,175,55,0.1),rgba(212,175,55,0.03))", borderRadius:"var(--radius-sm)", border:"1px solid var(--gold-border)" }}>
                <div style={{ fontSize:"36px" }}>💎</div>
                <div>
                  <p style={{ color:"var(--gold)", fontSize:"28px", fontWeight:"900", margin:0, lineHeight:1 }}>{balance.toFixed(3)} BD</p>
                  <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:"4px 0 0" }}>يمكنك استخدامه كخصم في طلبك القادم</p>
                </div>
              </div>

              <div style={{ background:"rgba(212,175,55,0.06)", borderRadius:"var(--radius-sm)", padding:"12px 14px", marginTop:"12px" }}>
                <p style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"700", margin:"0 0 4px" }}>💡 كيف تكسب المزيد؟</p>
                <p style={{ color:"var(--text-muted)", fontSize:"12px", margin:0, lineHeight:1.6 }}>
                  عند إتمام كل طلب، يُضاف لرصيدك نسبة مئوية من قيمة الطلب تلقائياً كمكافأة ولاء.
                </p>
              </div>
            </div>

            {/* Transactions */}
            <div className="card" style={{ padding:"20px" }}>
              <p className="section-title">📋 سجل الرصيد</p>
              {txLoading ? (
                <p style={{ color:"var(--text-muted)", textAlign:"center", padding:"20px" }}>جاري التحميل...</p>
              ) : transactions.length === 0 ? (
                <div style={{ textAlign:"center", padding:"30px" }}>
                  <div style={{ fontSize:"40px", marginBottom:"10px" }}>🎁</div>
                  <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>لا توجد معاملات بعد — أكمل طلبك الأول لتكسب مكافآت!</p>
                  <button onClick={() => navigate("/shop")} className="btn-gold" style={{ marginTop:"14px", padding:"10px 24px" }}>
                    تسوق الآن ✨
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {transactions.map(tx => (
                    <div key={tx.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:"rgba(255,255,255,0.02)", borderRadius:"var(--radius-sm)", border:"1px solid var(--border)" }}>
                      <div>
                        <p style={{ color:"var(--text)", fontSize:"13px", margin:0 }}>{tx.description}</p>
                        <p style={{ color:"var(--text-muted)", fontSize:"11px", margin:"2px 0 0" }}>
                          {tx.createdAt?.toDate?.()?.toLocaleDateString("ar-BH") || "—"}
                        </p>
                      </div>
                      <span style={{ color:"#22c55e", fontWeight:"800", fontSize:"14px" }}>+{Number(tx.amount).toFixed(3)} BD</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
