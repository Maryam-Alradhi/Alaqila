import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "./Toast";
import logo from "./assets/Logo.png";
import background from "./assets/download.mp4";

type Mode = "landing" | "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("landing");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email.trim()) { showToast("أدخل إيميلك أولاً عشان نرسل لك رابط الاستعادة", "warning"); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast("تم إرسال رابط استعادة كلمة المرور لإيميلك 📩", "success");
    } catch {
      showToast("تعذّر إرسال الرابط، تأكد من الإيميل", "error");
    }
  };

  const reset = () => { setName(""); setEmail(""); setPassword(""); setLoading(false); };

  const handleSubmit = async () => {
    if (mode === "register" && !name.trim()) { showToast("أدخل اسمك", "warning"); return; }
    if (!email.trim()) { showToast("أدخل الإيميل", "warning"); return; }
    if (password.length < 6) { showToast("كلمة المرور 6 أحرف على الأقل", "warning"); return; }
    try {
      setLoading(true);
      if (mode === "login") {
        // ✅ تذكرني: يخلي الجلسة تضل بعد إغلاق المتصفح، وإلا تنتهي بمجرد إغلاقه
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
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

  if (mode === "landing") {
    return (
      <div className="hero" style={{
        position: "relative", minHeight: "100vh", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* ── Background video ── */}
        <video
          className="hero-video"
          src={background}
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", zIndex: 0,
          }}
        />

        {/* ── Overlays: dark gradient for legibility + soft white wash ── */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(180deg, rgba(6,6,6,0.55) 0%, rgba(6,6,6,0.25) 30%, rgba(6,6,6,0.35) 60%, rgba(6,6,6,0.85) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "rgba(255,255,255,0.07)", mixBlendMode: "overlay",
        }} />

        {/* ── Decorative sparkles ── */}
        <span style={{ position: "absolute", top: "18%", left: "12%", zIndex: 2, color: "var(--gold)", fontSize: "22px", opacity: 0.7 }}>✦</span>
        <span style={{ position: "absolute", top: "68%", right: "10%", zIndex: 2, color: "var(--gold)", fontSize: "16px", opacity: 0.55 }}>✦</span>
        <span style={{ position: "absolute", top: "30%", right: "16%", zIndex: 2, color: "var(--gold)", fontSize: "12px", opacity: 0.5 }}>✦</span>

        {/* ── Top bar: logo ── */}
        <div className="animate-fadeIn" style={{
          position: "relative", zIndex: 2,
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "36px 20px 0",
        }}>
          <img src={logo} alt="العقيلة"
            style={{ height: "110px", width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* ── Center hero content ── */}
        <div className="animate-slideUp" style={{
          position: "relative", zIndex: 2, flex: 1,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "20px", gap: "18px",
        }}>
          <span style={{
            color: "var(--gold)", fontSize: "12px", fontWeight: "700", letterSpacing: "0.25em",
            textTransform: "uppercase", opacity: 0.9,
          }}>
            دار مجوهرات فاخرة
          </span>

          <h1 className="gold-shimmer font-display" style={{
            fontSize: "clamp(38px,9vw,72px)", fontWeight: "700", lineHeight: 1.05, margin: 0,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}>
            العقيلة
          </h1>

          <div style={{ width: "70px", height: "1px", background: "linear-gradient(90deg,transparent,var(--gold),transparent)" }} />

          <p style={{ color: "rgba(237,232,223,0.85)", fontSize: "clamp(14px,2.2vw,17px)", maxWidth: "440px", margin: 0 }}>
            تصاميم استثنائية تجمع بين الفخامة والحرفية، صُنعت لتبقى معك في كل لحظة
          </p>

          <button onClick={() => navigate("/shop")} className="btn-3d"
            style={{
              marginTop: "10px", padding: "18px 52px", background: "linear-gradient(135deg,#D4AF37,#9a7e22)",
              color: "#000", border: "none", borderRadius: "999px", fontWeight: "800", fontSize: "16px",
              cursor: "pointer", letterSpacing: "0.02em",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
            ابدأ التسوق ✨
          </button>

          {/* ── Trust badges ── */}
          <div style={{ display: "flex", gap: "22px", marginTop: "26px", flexWrap: "wrap", justifyContent: "center" }}>
            {[["💎","جودة أصلية"], ["🚚","توصيل سريع"], ["✨","تصميم فاخر"]].map(([icon, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px" }}>{icon}</span>
                <span style={{ color: "rgba(237,232,223,0.7)", fontSize: "12px", fontWeight: "600" }}>{label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "22px", marginTop: "22px" }}>
            <button onClick={() => { reset(); setMode("login"); }}
              style={{ background: "none", border: "none", color: "rgba(237,232,223,0.9)", fontSize: "13px", fontWeight: "700", cursor: "pointer", padding: 0, transition: "var(--transition)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(237,232,223,0.9)")}>
              تسجيل الدخول
            </button>
            <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.25)" }} />
            <button onClick={() => { reset(); setMode("register"); }}
              style={{ background: "none", border: "none", color: "rgba(237,232,223,0.9)", fontSize: "13px", fontWeight: "700", cursor: "pointer", padding: 0, transition: "var(--transition)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(237,232,223,0.9)")}>
              إنشاء حساب جديد
            </button>
          </div>
        </div>

        {/* ── Bottom scroll cue ── */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", paddingBottom: "26px" }}>
          <p style={{ color: "rgba(237,232,223,0.55)", fontSize: "11px", letterSpacing: "0.1em" }}>
            بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", padding: "20px",
    }}>
      {/* Background orbs + decorative rings */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-15%", right:"-10%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", bottom:"-15%", left:"-10%", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", top:"-10%", left:"-15%", width:"420px", height:"420px", borderRadius:"50%", border:"1px solid var(--gold-border)", opacity:0.5 }} />
        <div style={{ position:"absolute", bottom:"-15%", right:"-15%", width:"380px", height:"380px", borderRadius:"50%", border:"1px solid var(--gold-border)", opacity:0.4 }} />
        {/* Grid pattern */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px)", backgroundSize:"60px 60px" }} />
      </div>

      {/* ── Login / Register Form ── */}
      <div className="animate-scaleIn" style={{ width:"100%", maxWidth:"400px", position: "relative", zIndex: 1 }}>
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
            <div style={{ width:"64px", height:"64px", background:"rgba(212,175,55,0.08)", border:"1.5px solid var(--gold-border)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px", margin:"0 auto 14px", boxShadow:"0 0 24px rgba(212,175,55,0.25)" }} className="animate-glow">
              {mode === "login" ? "🔑" : "✨"}
            </div>
            <h2 style={{ color:"var(--gold)", fontSize:"22px", fontWeight:"800", marginBottom:"4px" }}>
              {mode === "login" ? "أهلاً بعودتك" : "إنشاء حساب"}
            </h2>
            <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>
              {mode === "login" ? "سجّل دخولك لمتابعة طلباتك" : "انضم إلى عائلة العقيلة"}
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

          {/* Remember me + forgot password */}
          {mode === "login" && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"6px", color:"var(--text-muted)", fontSize:"12px", cursor:"pointer" }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                تذكرني
              </label>
              <span onClick={handleForgotPassword} style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>
                نسيت كلمة المرور؟
              </span>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading} className={loading ? "" : "btn-3d"}
            style={{ width:"100%", padding:"14px", background:loading?"rgba(212,175,55,0.4)":"linear-gradient(135deg,#D4AF37,#b8942a)", color:"#000", border:"none", borderRadius:"var(--radius)", fontWeight:"800", fontSize:"15px", cursor:loading?"not-allowed":"pointer", boxShadow:loading?"none":"0 4px 20px rgba(212,175,55,0.3)", marginBottom:"16px" }}>
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
          <button onClick={() => navigate("/shop")} className="btn-3d"
            style={{ width:"100%", padding:"12px", background:"transparent", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:"var(--radius)", fontSize:"13px", cursor:"pointer", transition:"color 0.25s ease" }}
            onMouseEnter={e => { e.currentTarget.style.color="var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.color="var(--text-muted)"; }}>
            متابعة كزائر 👤
          </button>

          <p style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", color:"var(--text-muted)", fontSize:"11px", marginTop:"18px" }}>
            🛡️ بياناتك آمنة ومحمية
          </p>
        </div>
      </div>
    </div>
  );
}
