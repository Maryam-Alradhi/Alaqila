import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "./Toast";
import logo from "./assets/Logo.png";
import background from "./assets/download.mp4";
import ringShowcaseImage from "./assets/login-page.png";
import qualityIcon from "./assets/icons/quality.png";
import fastDeliveryIcon from "./assets/icons/fast-delivery.png";
import uniqueDesignsIcon from "./assets/icons/unique-designs.png";
import appleIcon from "./assets/icons/apple.png";
import encryptedIcon from "./assets/icons/encrypted.png";
import dataProtectedIcon from "./assets/icons/data-protected.png";
import keyIcon from "./assets/icons/key.png";

type Mode = "landing" | "login" | "register";

export default function Login() {
  const location = useLocation();
  // ✅ الصفحة الرئيسية "/" تفتح على المقدمة (landing)، بينما "/login" تفتح مباشرة على نموذج
  // تسجيل الدخول — قبل هالتعديل كانت كل الروابط اللي تودّي لـ "/login" ترجع تعرض المقدمة بالغلط
  const [mode, setMode] = useState<Mode>(location.pathname === "/login" ? "login" : "landing");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { user, login, loginWithGoogle, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(location.pathname === "/login" ? "login" : "landing");
  }, [location.pathname]);

  const goAfterLogin = (loggedInEmail: string) => {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;
    if (adminEmail && loggedInEmail.toLowerCase() === adminEmail.toLowerCase()) navigate("/manage-store-aqeela");
    else navigate("/shop");
  };

  // ✅ ننتظر تحديث الـ context الفعلي قبل التنقّل — التنقّل مباشرة بعد await login() يصير قبل ما
  // isAdmin يتحدّث بالـ React state، فيرجّع يطلع نموذج تسجيل الدخول لين المستخدم يعمل refresh يدوي
  useEffect(() => {
    if (user) goAfterLogin(user.email || "");
  }, [user]);

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
      // ✅ التنقّل يصير تلقائياً من الـ useEffect فوق بمجرد ما user يتحدّث
    } catch {
      showToast("تعذّر تسجيل الدخول بجوجل، حاول مجدداً", "error");
    } finally { setLoading(false); }
  };

  const handleAppleLogin = () => {
    showToast("تسجيل الدخول بـ Apple يحتاج ربط حساب Apple Developer أولاً — خبريني إذا تبين نفعّلها", "info");
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
        // ✅ التنقّل يصير تلقائياً من الـ useEffect بمجرد ما user يتحدّث
      } else {
        await register(name.trim(), email.trim(), password);
        showToast("تم إنشاء حسابك 🎉", "success");
        // ✅ التنقّل يصير تلقائياً من الـ useEffect بمجرد ما user يتحدّث
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
            {[[qualityIcon,"جودة أصلية"], [fastDeliveryIcon,"توصيل سريع"], [uniqueDesignsIcon,"تصميم فاخر"]].map(([icon, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img src={icon} alt="" style={{ width: "14px", height: "14px", objectFit: "contain", filter: "invert(1)" }} />
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
    <div style={{ minHeight: "100vh", background: "var(--bg)", direction: "rtl" }}>
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: "100vh" }}>

        {/* ── Visual showcase panel (renders on the right in RTL) ── */}
        <div className="hide-mobile shine-sweep" style={{ flex: "1 1 480px", position: "relative", minHeight: "560px", overflow: "hidden", background: "#000" }}>
          <img src={ringShowcaseImage} alt="عرض الخاتم"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,6,6,0.4) 0%, rgba(6,6,6,0.05) 30%, rgba(6,6,6,0.55) 100%)" }} />

          {/* Top badge */}
          <div style={{ position: "absolute", top: "28px", left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 2 }}>
            <div className="icon-badge-3d" style={{ width: "52px", height: "52px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", margin: "0 auto" }}>
              🏆
            </div>
            <p className="font-display" style={{ color: "var(--gold)", fontWeight: "700", fontSize: "15px", margin: "10px 0 2px", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>تتميز بالجودة</p>
            <p style={{ color: "rgba(237,232,223,0.75)", fontSize: "11px", margin: 0 }}>لأنك تستحق الأفضل</p>
          </div>

          {/* Bottom trust badges */}
          <div style={{ position: "absolute", bottom: "26px", left: 0, right: 0, zIndex: 2, display: "flex", justifyContent: "center", gap: "34px", flexWrap: "wrap", padding: "0 20px" }}>
            {[[qualityIcon, "ضمان الجودة", "على جميع المنتجات"], [fastDeliveryIcon, "شحن سريع وآمن", "إلى جميع المدن"], [encryptedIcon, "تسوق آمن", "100%"]].map(([icon, title, sub]) => (
              <div key={title} style={{ textAlign: "center" }}>
                <div className="icon-badge-3d" style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", margin: "0 auto 6px" }}>
                  {icon.includes(".png")
                    ? <img src={icon} alt="" style={{ width: "15px", height: "15px", objectFit: "contain" }} />
                    : icon}
                </div>
                <p style={{ color: "var(--gold)", fontSize: "11px", fontWeight: "700", margin: 0 }}>{title}</p>
                <p style={{ color: "rgba(237,232,223,0.6)", fontSize: "10px", margin: "2px 0 0" }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Form panel (renders on the left in RTL) ── */}
        <div style={{ flex: "1 1 420px", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-15%", left: "-15%", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)" }} />
          </div>

          <div className="animate-scaleIn" style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
            <button onClick={() => { reset(); setMode("landing"); }}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", marginBottom: "20px", padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
              ← رجوع
            </button>

            <h2 className="font-display gold-shimmer" style={{ fontSize: "26px", fontWeight: "800", margin: "0 0 6px" }}>
              ✨ {mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "22px" }}>
              {mode === "login" ? "سجّل دخولك للوصول لحسابك ومتابعة طلباتك" : "انضم إلى عائلة العقيلة"}
            </p>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "22px" }}>
              {(["login","register"] as const).map(m => (
                <button key={m} onClick={() => { reset(); setMode(m); }}
                  style={{ flex: 1, padding: "10px 4px", background: "none", border: "none", borderBottom: `2px solid ${mode===m ? "var(--gold)" : "transparent"}`, color: mode===m ? "var(--gold)" : "var(--text-muted)", fontWeight: mode===m ? "700" : "500", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", marginBottom: "-1px" }}>
                  {m==="login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              {mode === "register" && (
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", fontSize: "15px" }}>👤</span>
                  <input className="inp" placeholder="الاسم الكامل" value={name}
                    onChange={e => setName(e.target.value)} style={{ paddingRight: "42px" }} />
                </div>
              )}
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", fontSize: "15px" }}>✉️</span>
                <input className="inp" type="email" placeholder="البريد الإلكتروني" value={email}
                  onChange={e => setEmail(e.target.value)} style={{ paddingRight: "42px" }} dir="ltr"
                  autoFocus={mode === "login"} />
              </div>
              <div style={{ position: "relative" }}>
                <img src={keyIcon} alt="" style={{ position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", width: "14px", height: "14px", objectFit: "contain", filter: "invert(1)", opacity: 0.85 }} />
                <input className="inp" type={showPass ? "text" : "password"} placeholder="كلمة المرور"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  style={{ paddingRight: "42px", paddingLeft: "44px" }} dir="ltr" />
                <button onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", top: "50%", left: "12px", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "16px", padding: "2px" }}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Remember me + forgot password */}
            {mode === "login" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <span onClick={handleForgotPassword} style={{ color: "var(--gold)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                  نسيت كلمة المرور؟
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}>
                  تذكرني
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                </label>
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading} className={loading ? "" : "btn-3d"}
              style={{ width: "100%", padding: "14px", background: loading ? "rgba(212,175,55,0.4)" : "linear-gradient(135deg,#D4AF37,#b8942a)", color: "#000", border: "none", borderRadius: "var(--radius)", fontWeight: "800", fontSize: "15px", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 20px rgba(212,175,55,0.3)", marginBottom: "18px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {loading
                ? <span className="animate-pulse">جاري التحميل...</span>
                : (mode === "login"
                  ? <><img src={keyIcon} alt="" style={{ width: "15px", height: "15px", objectFit: "contain" }} /> تسجيل الدخول</>
                  : <>🎉 إنشاء الحساب</>)}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0 0 16px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>أو</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            {/* Social login */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
              <button onClick={handleAppleLogin} disabled={loading} className="btn-3d"
                style={{ width: "100%", padding: "12px", background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit" }}>
                <img src={appleIcon} alt="" style={{ width: "16px", height: "16px", objectFit: "contain", filter: "invert(1)" }} /> تسجيل الدخول بـ Apple
              </button>
              <button onClick={handleGoogleLogin} disabled={loading} className="btn-3d"
                style={{ width: "100%", padding: "12px", background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit" }}>
                <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#4285F4", color: "#fff", fontSize: "10px", fontWeight: "900", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>G</span>
                تسجيل الدخول بـ Google
              </button>
            </div>

            <button onClick={() => navigate("/shop")} className="btn-3d"
              style={{ width: "100%", padding: "11px", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; }}>
              متابعة كزائر 👤
            </button>

            <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "var(--text-muted)", fontSize: "11px", marginTop: "18px" }}>
              <img src={dataProtectedIcon} alt="" style={{ width: "14px", height: "14px", objectFit: "contain", filter: "invert(1)" }} /> بياناتك آمنة ومحمية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
