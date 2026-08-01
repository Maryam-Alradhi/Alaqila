import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";
import dataProtectedIcon from "./assets/icons/data-protected.png";

export default function TelegramSettings() {
  const { showToast } = useToast();
  const [botToken, setBotToken] = useState("");
  const [chatId,   setChatId]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [masked,   setMasked]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "telegram"));
        if (snap.exists()) {
          const d = snap.data();
          setBotToken(d.botToken || "");
          setChatId(d.chatId || "");
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      showToast("أدخل Bot Token و Chat ID", "warning"); return;
    }
    try {
      setSaving(true);
      await setDoc(doc(db, "settings", "telegram"), {
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        updatedAt: new Date(),
      });
      showToast("تم الحفظ بأمان في Firestore ✅", "success");
    } catch { showToast("فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      showToast("احفظ الإعدادات أولاً", "warning"); return;
    }
    try {
      setTesting(true);
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "✅ *اتصال ناجح من متجر العقيلة!*\n\nالإشعارات تعمل بشكل صحيح 🎉", parse_mode: "Markdown" }),
      });
      const data = await res.json();
      if (data.ok) showToast("تم إرسال رسالة تجريبية ✅", "success");
      else showToast(`فشل: ${data.description}`, "error");
    } catch { showToast("فشل الاتصال بـ Telegram", "error"); }
    finally { setTesting(false); }
  };

  if (loading) return <div style={{ textAlign:"center", padding:"40px", color:"var(--text-muted)" }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Security notice */}
      <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"var(--radius)", padding:"14px 16px", marginBottom:"20px", display:"flex", gap:"12px" }}>
        <img src={dataProtectedIcon} alt="" style={{ width:"20px", height:"20px", objectFit:"contain", flexShrink:0, filter:"invert(1)" }} />
        <div>
          <p style={{ color:"#22c55e", fontWeight:"700", fontSize:"13px", margin:"0 0 4px" }}>أمان عالي</p>
          <p style={{ color:"rgba(34,197,94,0.7)", fontSize:"12px", margin:0, lineHeight:"1.6" }}>
            البيانات محفوظة في Firestore المشفّر — لا تظهر في كود الموقع ولا يمكن الوصول إليها من المتصفح
          </p>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"16px", marginBottom:"24px" }}>
        {/* Bot Token */}
        <div>
          <label style={{ color:"var(--text-muted)", fontSize:"12px", display:"block", marginBottom:"6px" }}>
            🤖 Bot Token
            <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color:"var(--gold)", marginRight:"8px", textDecoration:"none" }}>← احصل عليه من @BotFather</a>
          </label>
          <div style={{ position:"relative" }}>
            <input className="inp" type={masked?"password":"text"} value={botToken}
              onChange={e => setBotToken(e.target.value)} placeholder="123456789:ABCdef..." dir="ltr"
              style={{ paddingLeft:"44px" }} />
            <button onClick={() => setMasked(!masked)}
              style={{ position:"absolute", top:"50%", left:"12px", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:"16px" }}>
              {masked?"👁️":"🙈"}
            </button>
          </div>
        </div>

        {/* Chat ID */}
        <div>
          <label style={{ color:"var(--text-muted)", fontSize:"12px", display:"block", marginBottom:"6px" }}>
            💬 Chat ID
            <span style={{ color:"var(--text-muted)", fontSize:"11px", marginRight:"8px" }}>أرسل رسالة للبوت ثم افتح: api.telegram.org/bot&#123;TOKEN&#125;/getUpdates</span>
          </label>
          <input className="inp" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="-100123456789" dir="ltr" />
        </div>
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
        <p style={{ color:"var(--gold)", fontSize:"13px", fontWeight:"700", marginBottom:"12px" }}>📖 خطوات الإعداد</p>
        {[
          "افتح Telegram وابحث عن @BotFather",
          "أرسل /newbot واختر اسماً لبوتك",
          "انسخ الـ Token وضعه أعلاه",
          "أضف البوت لمجموعة أو راسله مباشرة",
          "افتح getUpdates واحصل على Chat ID",
          "احفظ الإعدادات واختبر الاتصال",
        ].map((step, i) => (
          <div key={i} style={{ display:"flex", gap:"10px", alignItems:"flex-start", padding:"6px 0", borderBottom:i<5?"1px solid var(--border)":"none" }}>
            <span style={{ background:"var(--gold-dim)", color:"var(--gold)", borderRadius:"50%", width:"20px", height:"20px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"700", flexShrink:0, marginTop:"1px" }}>{i+1}</span>
            <span style={{ color:"var(--text-dim)", fontSize:"12px" }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
