import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "./Toast";
import appleIcon from "./assets/icons/apple.png";
import keyIcon from "./assets/icons/key.png";

type Mode = "login" | "register";

// ✅ يظهر فوق صفحة الدفع مباشرة (بدون ما ينتقل المستخدم لصفحة ثانية) — بمجرد ما يسجّل دخول
// أو ينشئ حساب، الـ modal يختفي تلقائياً ونموذج الدفع يظهر مكانه، بدون أي تنقّل محيّر
export default function AuthGateModal() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, loginWithGoogle, register } = useAuth();
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

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      showToast("مرحباً بعودتك! 👋", "success");
      // ✅ ما نسوي navigate — الـ modal يختفي تلقائياً بمجرد ما user يتحدّث بالـ context
    } catch {
      showToast("تعذّر تسجيل الدخول بجوجل، حاول مجدداً", "error");
    } finally { setLoading(false); }
  };

  const handleAppleLogin = () => {
    showToast("تسجيل الدخول بـ Apple يحتاج ربط حساب Apple Developer أولاً", "info");
  };

  const handleSubmit = async () => {
    if (mode === "register" && !name.trim()) { showToast("أدخل اسمك", "warning"); return; }
    if (!email.trim()) { showToast("أدخل الإيميل", "warning"); return; }
    if (password.length < 6) { showToast("كلمة المرور 6 أحرف على الأقل", "warning"); return; }
    try {
      setLoading(true);
      if (mode === "login") {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        await login(email.trim(), password);
        showToast("مرحباً بعودتك! 👋", "success");
      } else {
        await register(name.trim(), email.trim(), password);
        showToast("تم إنشاء حسابك 🎉", "success");
      }
      // ✅ نجاح تسجيل الدخول/إنشاء الحساب يحدّث user بالـ context تلقائياً — الصفحة الأم تخفي الـ modal وتعرض نموذج الدفع فوراً
    } catch (err: any) {
      const c = err?.code || "";
      if (c.includes("wrong-password") || c.includes("invalid-credential") || c.includes("user-not-found"))
        showToast("إيميل أو كلمة مرور خاطئة ❌", "error");
      else if (c.includes("email-already-in-use"))
        showToast("هذا الإيميل مسجّل مسبقاً", "error");
      // ✅ فايربيس يوقف المحاولات تلقائياً من السيرفر بعد عدة محاولات فاشلة متتالية (حماية جاهزة ضد التخمين)
      else if (c.includes("too-many-requests"))
        showToast("محاولات كثيرة جداً، انتظري شوي وحاولي مرة ثانية ⏳", "warning");
      else showToast("حدث خطأ، حاول مجدداً", "error");
    } finally { setLoading(false); }
  };

  return createPortal(
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(10px)", zIndex:500 }} />
      <div style={{ position:"fixed", inset:0, zIndex:501, overflowY:"auto", padding:"40px 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div className="animate-scaleIn card" style={{ width:"100%", maxWidth:"420px", padding:"30px 26px", direction:"rtl", border:"1px solid var(--gold-border)", boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }}>

          <button onClick={() => navigate("/cart")}
            style={{ display:"flex", alignItems:"center", gap:"6px", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", fontSize:"13px", marginBottom:"18px", padding:0 }}>
            ← رجوع للسلة
          </button>

          <h2 className="font-display gold-shimmer" style={{ fontSize:"22px", fontWeight:"800", margin:"0 0 6px" }}>
            ✨ سجّلي دخولك لإتمام طلبك
          </h2>
          <p style={{ color:"var(--text-muted)", fontSize:"13px", marginBottom:"20px" }}>
            عشان تقدرين تتابعين طلبك بسهولة من "طلباتي" لاحقاً
          </p>

          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:"1px solid var(--border)", marginBottom:"20px" }}>
            {(["login","register"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex:1, padding:"10px 4px", background:"none", border:"none", borderBottom:`2px solid ${mode===m ? "var(--gold)" : "transparent"}`, color: mode===m ? "var(--gold)" : "var(--text-muted)", fontWeight: mode===m ? "700" : "500", fontSize:"13px", cursor:"pointer", fontFamily:"inherit", marginBottom:"-1px" }}>
                {m==="login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"14px" }}>
            {mode === "register" && (
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)", fontSize:"15px" }}>👤</span>
                <input className="inp" placeholder="الاسم الكامل" value={name}
                  onChange={e => setName(e.target.value)} style={{ paddingRight:"42px" }} />
              </div>
            )}
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)", fontSize:"15px" }}>✉️</span>
              <input className="inp" type="email" placeholder="البريد الإلكتروني" value={email}
                onChange={e => setEmail(e.target.value)} style={{ paddingRight:"42px" }} dir="ltr" autoFocus />
            </div>
            <div style={{ position:"relative" }}>
              <img src={keyIcon} alt="" style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)", width:"14px", height:"14px", objectFit:"contain", filter:"invert(1)", opacity:0.85 }} />
              <input className="inp" type={showPass ? "text" : "password"} placeholder="كلمة المرور"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ paddingRight:"42px", paddingLeft:"44px" }} dir="ltr" />
              <button onClick={() => setShowPass(!showPass)}
                style={{ position:"absolute", top:"50%", left:"12px", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:"16px", padding:"2px" }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <span onClick={handleForgotPassword} style={{ color:"var(--gold)", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>
                نسيت كلمة المرور؟
              </span>
              <label style={{ display:"flex", alignItems:"center", gap:"6px", color:"var(--text-muted)", fontSize:"12px", cursor:"pointer" }}>
                تذكرني
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
              </label>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className={loading ? "" : "btn-3d"}
            style={{ width:"100%", padding:"14px", background: loading ? "rgba(212,175,55,0.4)" : "linear-gradient(135deg,#D4AF37,#b8942a)", color:"#000", border:"none", borderRadius:"var(--radius)", fontWeight:"800", fontSize:"15px", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 20px rgba(212,175,55,0.3)", marginBottom:"16px", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
            {loading
              ? <span className="animate-pulse">جاري التحميل...</span>
              : (mode === "login"
                ? <><img src={keyIcon} alt="" style={{ width:"15px", height:"15px", objectFit:"contain" }} /> تسجيل الدخول</>
                : <>🎉 إنشاء الحساب</>)}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:"12px", margin:"0 0 14px" }}>
            <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
            <span style={{ color:"var(--text-muted)", fontSize:"11px" }}>أو</span>
            <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            <button onClick={handleAppleLogin} disabled={loading} className="btn-3d"
              style={{ width:"100%", padding:"12px", background:"var(--bg-card)", color:"var(--text)", border:"1px solid var(--border)", borderRadius:"var(--radius)", fontSize:"13px", fontWeight:"600", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontFamily:"inherit" }}>
              <img src={appleIcon} alt="" style={{ width:"16px", height:"16px", objectFit:"contain", filter:"invert(1)" }} /> تسجيل الدخول بـ Apple
            </button>
            <button onClick={handleGoogleLogin} disabled={loading} className="btn-3d"
              style={{ width:"100%", padding:"12px", background:"var(--bg-card)", color:"var(--text)", border:"1px solid var(--border)", borderRadius:"var(--radius)", fontSize:"13px", fontWeight:"600", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontFamily:"inherit" }}>
              <span style={{ width:"16px", height:"16px", borderRadius:"50%", background:"#4285F4", color:"#fff", fontSize:"10px", fontWeight:"900", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>G</span>
              تسجيل الدخول بـ Google
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
