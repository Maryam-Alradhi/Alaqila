import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";
import dataProtectedIcon from "./assets/icons/data-protected.png";

// توليد topic عشوائي طويل — يضمن ما حد يقدر يخمّنه أو يتفاعل مع قناتك
function generateTopic(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `alaqila-orders-${hex}`;
}

export default function NotificationSettings() {
  const { showToast } = useToast();
  const [topic,   setTopic]   = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ntfy"));
        if (snap.exists() && snap.data().topic) setTopic(snap.data().topic);
        else setTopic(generateTopic()); // أول مرة — نقترح اسم جاهز وعشوائي
      } catch { setTopic(generateTopic()); }
      finally { setLoading(false); }
    })();
  }, []);

  const saveTopic = async () => {
    if (!topic.trim()) { showToast("أدخل اسم القناة (topic)", "warning"); return false; }
    await setDoc(doc(db, "settings", "ntfy"), { topic: topic.trim(), updatedAt: new Date() });
    return true;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const ok = await saveTopic();
      if (ok) showToast("تم الحفظ ✅", "success");
    } catch { showToast("فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  // ✅ الاختبار يحفظ القناة أولاً — عشان يستحيل ينجح الاختبار وتكون القناة الفعلية بقاعدة البيانات مختلفة أو غير محفوظة
  const handleTest = async () => {
    try {
      setTesting(true);
      const ok = await saveTopic();
      if (!ok) return;
      const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic.trim())}`, {
        method: "POST",
        headers: { "Title": "Test - Alaqila Store", "Tags": "white_check_mark" },
        body: "اتصال ناجح من متجر العقيلة! الإشعارات تعمل بشكل صحيح 🎉",
      });
      if (res.ok) showToast("تم الحفظ وإرسال إشعار تجريبي ✅ — تأكدي إنه وصلك بتطبيق ntfy", "success");
      else showToast("فشل الإرسال، تأكدي من اسم القناة", "error");
    } catch { showToast("فشل الاتصال بـ ntfy", "error"); }
    finally { setTesting(false); }
  };

  if (loading) return <div style={{ textAlign:"center", padding:"40px", color:"var(--text-muted)" }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Security notice */}
      <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"var(--radius)", padding:"14px 16px", marginBottom:"20px", display:"flex", gap:"12px" }}>
        <img src={dataProtectedIcon} alt="" style={{ width:"20px", height:"20px", objectFit:"contain", flexShrink:0, filter:"invert(1)" }} />
        <div>
          <p style={{ color:"#22c55e", fontWeight:"700", fontSize:"13px", margin:"0 0 4px" }}>إشعارات فورية بدون تعقيد</p>
          <p style={{ color:"rgba(34,197,94,0.7)", fontSize:"12px", margin:0, lineHeight:"1.6" }}>
            الموقع يرسل تفاصيل كل طلب (وصورة الإيصال إن وجدت) مباشرة لتطبيق ntfy على جوالك، فور ما العميل يضغط "تأكيد الطلب".
          </p>
        </div>
      </div>

      <div style={{ marginBottom:"24px" }}>
        <label style={{ color:"var(--text-muted)", fontSize:"12px", display:"block", marginBottom:"6px" }}>
          اسم القناة (Topic)
          <span style={{ color:"#f59e0b", fontSize:"11px", marginRight:"8px" }}>⚠️ خليه سري — لا ترسليه لأحد</span>
        </label>
        <input className="inp" value={topic} onChange={e => setTopic(e.target.value)} dir="ltr" style={{ fontFamily:"monospace", fontSize:"13px" }} />
      </div>

      <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} className="btn-gold" style={{ flex:1, opacity:saving?0.6:1 }}>
          {saving ? "جاري الحفظ..." : "💾 حفظ الإعدادات"}
        </button>
        <button onClick={handleTest} disabled={testing} className="btn-3d"
          style={{ flex:1, padding:"12px", background:"rgba(59,130,246,0.1)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.3)", borderRadius:"var(--radius)", cursor:testing?"not-allowed":"pointer", fontSize:"14px", fontWeight:"600", fontFamily:"inherit", opacity:testing?0.6:1 }}>
          {testing ? "جاري الإرسال..." : "🧪 اختبار الاتصال"}
        </button>
      </div>

      {/* Setup guide */}
      <div style={{ marginTop:"24px", background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"16px" }}>
        <p style={{ color:"var(--gold)", fontSize:"13px", fontWeight:"700", marginBottom:"12px" }}>📖 خطوات الإعداد (مرة وحدة بس)</p>
        {[
          "حمّلي تطبيق ntfy من App Store أو Google Play",
          "افتحي التطبيق واضغطي (+) لإضافة قناة جديدة",
          "الصقي اسم القناة (Topic) من الأعلى بالضبط زي ما هو",
          "احفظي الإعدادات هنا واضغطي \"اختبار الاتصال\" للتأكد",
        ].map((step, i) => (
          <div key={i} style={{ display:"flex", gap:"10px", alignItems:"flex-start", padding:"6px 0", borderBottom:i<3?"1px solid var(--border)":"none" }}>
            <span style={{ background:"var(--gold-dim)", color:"var(--gold)", borderRadius:"50%", width:"20px", height:"20px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"700", flexShrink:0, marginTop:"1px" }}>{i+1}</span>
            <span style={{ color:"var(--text-dim)", fontSize:"12px" }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
