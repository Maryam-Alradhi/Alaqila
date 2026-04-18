import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useToast } from "./Toast";
import logo from "./assets/Logo.jpeg";

type Mode = "landing" | "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("landing");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login, register, isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const reset = () => { setName(""); setEmail(""); setPassword(""); setLoading(false); };

  const handleSubmit = async () => {
    if (mode === "register" && !name.trim()) { showToast("أدخل اسمك", "warning"); return; }
    if (!email.trim()) { showToast("أدخل الإيميل", "warning"); return; }
    if (password.length < 6) { showToast("كلمة المرور 6 أحرف على الأقل", "warning"); return; }
    try {
      setLoading(true);
      if (mode === "login") {
        await login(email.trim(), password);
        showToast("مرحباً بعودتك! 👋", "success");
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;
        if (adminEmail && email.trim().toLowerCase() === adminEmail.toLowerCase()) {
          navigate("/manage-store-aqeela");
        } else {
          navigate("/shop");
        }
      } else {
        await register(name.trim(), email.trim(), password);
        showToast("تم إنشاء حسابك 🎉", "success");
        navigate("/shop");
      }
    } catch (err: any) {
      const c = err?.code || "";
      if (c.includes("wrong-password") || c.includes("invalid-credential") || c.includes("user-not-found"))
        showToast("إيميل أو كلمة مرور خاطئة ❌", "error");
      else if (c.includes("email-already-in-use"))
        showToast("هذا الإيميل مسجّل مسبقاً", "error");
      else showToast("حدث خطأ، حاول مجدداً", "error");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", padding: "20px",
    }}>
      {/* Background orbs */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-15%", right:"-10%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", bottom:"-15%", left:"-10%", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)" }} />
        {/* Grid pattern */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px)", backgroundSize:"60px 60px" }} />
      </div>

      {mode === "landing" ? (
        /* ── Landing ── */
        <div className="animate-slideUp" style={{ width:"100%", maxWidth:"440px", textAlign:"center" }}>
          {/* Logo */}
          <div style={{ marginBottom:"28px" }}>
            <img src={logo} alt="العقيلة"
              style={{ height:"100px", borderRadius:"50%", border:"2px solid var(--gold-border)", boxShadow:"0 0 40px rgba(212,175,55,0.2)", marginBottom:"16px" }}
              className="animate-glow"
            />
            <h1 className="gold-shimmer" style={{ fontSize:"clamp(28px,6vw,40px)", fontWeight:"900", lineHeight:1.1, marginBottom:"8px" }}>
              العقيلة
            </h1>
            <p style={{ color:"var(--text-muted)", fontSize:"15px" }}>أفخم المجوهرات والإكسسوارات</p>
          </div>

          {/* Action cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"16px" }}>
            <button onClick={() => { reset(); setMode("login"); }}
              style={{ width:"100%", padding:"16px 20px", background:"linear-gradient(135deg,#D4AF37,#b8942a)", color:"#000", border:"none", borderRadius:"var(--radius)", fontWeight:"800", fontSize:"16px", cursor:"pointer", boxShadow:"0 8px 24px rgba(212,175,55,0.3)", transition:"var(--transition)", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}
              onMouseEnter={e => (e.currentTarget.style.transform="translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform="none")}>
              <span>🔑</span> تسجيل الدخول
            </button>

            <button onClick={() => { reset(); setMode("register"); }}
              style={{ width:"100%", padding:"16px 20px", background:"var(--bg-card)", color:"var(--text)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius)", fontWeight:"700", fontSize:"15px", cursor:"pointer", transition:"var(--transition)", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}
              onMouseEnter={e => { e.currentTarget.style.background="var(--gold-dim)"; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="var(--bg-card)"; e.currentTarget.style.transform="none"; }}>
              <span>✨</span> إنشاء حساب جديد
            </button>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
            <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
            <span style={{ color:"var(--text-muted)", fontSize:"12px" }}>أو</span>
            <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
          </div>

          <button onClick={() => navigate("/shop")}
            style={{ width:"100%", padding:"13px", background:"transparent", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:"var(--radius)", fontSize:"14px", cursor:"pointer", transition:"var(--transition)" }}
            onMouseEnter={e => { e.currentTarget.style.color="var(--text)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.color="var(--text-muted)"; e.currentTarget.style.borderColor="var(--border)"; }}>
            متابعة كضيف 👤
          </button>

          <p style={{ color:"var(--text-muted)", fontSize:"12px", marginTop:"20px" }}>
            بالدخول أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </div>
      ) : (
        /* ── Login / Register Form ── */
        <div className="animate-scaleIn" style={{ width:"100%", maxWidth:"400px" }}>
          {/* Back */}
          <button onClick={() => { reset(); setMode("landing"); }}
            style={{ display:"flex", alignItems:"center", gap:"6px", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", fontSize:"13px", marginBottom:"24px", padding:0, transition:"var(--transition)" }}
            onMouseEnter={e => (e.currentTarget.style.color="var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color="var(--text-muted)")}>
            ← رجوع
          </button>

          {/* Card */}
          <div style={{ background:"rgba(13,17,32,0.9)", border:"1px solid var(--border)", borderRadius:"24px", padding:"32px 28px", backdropFilter:"blur(20px)", boxShadow:"0 24px 60px rgba(0,0,0,0.5), var(--shadow-gold)", position:"relative", overflow:"hidden" }}>
            {/* Top glow line */}
            <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:"1px", background:"linear-gradient(90deg,transparent,var(--gold),transparent)" }} />

            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:"28px" }}>
              <div style={{ width:"54px", height:"54px", background:"linear-gradient(135deg,#D4AF37,#a07020)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto 14px", boxShadow:"0 0 24px rgba(212,175,55,0.3)" }} className="animate-glow">
                {mode === "login" ? "🔑" : "✨"}
              </div>
              <h2 style={{ color:"var(--gold)", fontSize:"22px", fontWeight:"800", marginBottom:"4px" }}>
                {mode === "login" ? "أهلاً بعودتك" : "إنشاء حساب"}
              </h2>
              <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>
                {mode === "login" ? "سجّل دخولك للمتابعة" : "انضم إلى عائلة العقيلة"}
              </p>
            </div>

            {/* Fields */}
            <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"20px" }}>
              {mode === "register" && (
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)", fontSize:"15px" }}>👤</span>
                  <input className="inp" placeholder="الاسم الكامل" value={name}
                    onChange={e => setName(e.target.value)} style={{ paddingRight:"42px" }} autoFocus />
                </div>
              )}
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)", fontSize:"15px" }}>✉️</span>
                <input className="inp" type="email" placeholder="الإيميل" value={email}
                  onChange={e => setEmail(e.target.value)} style={{ paddingRight:"42px" }} dir="ltr"
                  autoFocus={mode==="login"} />
              </div>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)", fontSize:"15px" }}>🔒</span>
                <input className="inp" type={showPass?"text":"password"} placeholder="كلمة المرور"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleSubmit()}
                  style={{ paddingRight:"42px", paddingLeft:"44px" }} dir="ltr" />
                <button onClick={() => setShowPass(!showPass)}
                  style={{ position:"absolute", top:"50%", left:"12px", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:"16px", padding:"2px" }}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading}
              style={{ width:"100%", padding:"14px", background:loading?"rgba(212,175,55,0.4)":"linear-gradient(135deg,#D4AF37,#b8942a)", color:"#000", border:"none", borderRadius:"var(--radius)", fontWeight:"800", fontSize:"15px", cursor:loading?"not-allowed":"pointer", boxShadow:loading?"none":"0 4px 20px rgba(212,175,55,0.3)", transition:"var(--transition)", marginBottom:"16px" }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform="translateY(-1px)")}
              onMouseLeave={e => !loading && (e.currentTarget.style.transform="none")}>
              {loading ? <span className="animate-pulse">جاري التحميل...</span> : mode==="login" ? "دخول ✨" : "إنشاء الحساب 🎉"}
            </button>

            {/* Switch */}
            <p style={{ textAlign:"center", color:"var(--text-muted)", fontSize:"13px" }}>
              {mode==="login" ? "ليس لديك حساب؟ " : "لديك حساب؟ "}
              <span onClick={() => { reset(); setMode(mode==="login"?"register":"login"); }}
                style={{ color:"var(--gold)", cursor:"pointer", fontWeight:"700" }}>
                {mode==="login" ? "إنشاء حساب" : "تسجيل الدخول"}
              </span>
            </p>

            {/* Guest */}
            <div style={{ display:"flex", alignItems:"center", gap:"12px", margin:"14px 0" }}>
              <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
              <span style={{ color:"var(--text-muted)", fontSize:"11px" }}>أو</span>
              <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
            </div>
            <button onClick={() => navigate("/shop")}
              style={{ width:"100%", padding:"12px", background:"transparent", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:"var(--radius)", fontSize:"13px", cursor:"pointer", transition:"var(--transition)" }}
              onMouseEnter={e => { e.currentTarget.style.color="var(--text)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.color="var(--text-muted)"; e.currentTarget.style.borderColor="var(--border)"; }}>
              متابعة كضيف 👤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
