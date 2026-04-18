import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./Toast";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string;

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authMode, setAuthMode, login, register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (!showAuthModal) return null;

  const reset = () => {
    setName(""); setEmail(""); setPassword(""); setLoading(false); setShowPass(false);
  };

  const switchMode = (mode: "login" | "register") => {
    reset();
    setAuthMode(mode);
  };

  const close = () => {
    reset();
    setShowAuthModal(false);
  };

  const handleSubmit = async () => {
    if (authMode === "register" && !name.trim()) {
      showToast("أدخل اسمك الكامل", "warning"); return;
    }
    if (!email.trim()) { showToast("أدخل الإيميل", "warning"); return; }
    if (password.length < 6) { showToast("كلمة المرور 6 أحرف على الأقل", "warning"); return; }

    try {
      setLoading(true);
      if (authMode === "login") {
        await login(email.trim(), password);
        const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL?.toLowerCase();
        showToast(isAdmin ? "مرحباً بك في لوحة التحكم 👑" : "مرحباً بك! 👋", "success");
      } else {
        await register(name.trim(), email.trim(), password);
        showToast("تم إنشاء حسابك بنجاح 🎉", "success");
      }
      close();
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        showToast("إيميل أو كلمة مرور خاطئة ❌", "error");
      } else if (code === "auth/email-already-in-use") {
        showToast("هذا الإيميل مسجّل مسبقاً", "error");
      } else if (code === "auth/invalid-email") {
        showToast("صيغة الإيميل غير صحيحة", "error");
      } else {
        showToast("حدث خطأ، حاول مجدداً", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* ── Modal Card ── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1001,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: "400px",
            background: "rgba(13,16,32,0.92)",
            border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: "24px",
            padding: "36px 32px",
            direction: "rtl",
            position: "relative",
            boxShadow: "0 0 60px rgba(212,175,55,0.08), 0 24px 60px rgba(0,0,0,0.6)",
            animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Decorative glow ring */}
          <div style={{
            position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)",
            width: "120px", height: "2px",
            background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
            borderRadius: "2px",
          }} />

          {/* Close button */}
          <button
            onClick={close}
            style={{
              position: "absolute", top: "16px", left: "16px",
              background: "rgba(255,255,255,0.05)", border: "1px solid #333",
              borderRadius: "50%", width: "32px", height: "32px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#888", fontSize: "16px",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "#888")}
          >
            ×
          </button>

          {/* Logo / Title */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{
              width: "52px", height: "52px", margin: "0 auto 14px",
              background: "linear-gradient(135deg, #D4AF37, #a8843a)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px",
              boxShadow: "0 0 20px rgba(212,175,55,0.3)",
            }}>
              💍
            </div>
            <h2 style={{ color: "#D4AF37", margin: "0 0 4px", fontSize: "20px", fontWeight: "bold" }}>
              {authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
            </h2>
            <p style={{ color: "#666", fontSize: "13px", margin: 0 }}>
              {authMode === "login" ? "أدخل بياناتك للمتابعة" : "انضم إلى عائلة العقيلة"}
            </p>
          </div>

          {/* ── Inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            {authMode === "register" && (
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}>👤</span>
                <input
                  placeholder="الاسم الكامل"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ ...inp, paddingRight: "42px" }}
                  autoFocus
                />
              </div>
            )}

            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}>✉️</span>
              <input
                type="email"
                placeholder="الإيميل"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ ...inp, paddingRight: "42px" }}
                dir="ltr"
                autoFocus={authMode === "login"}
              />
            </div>

            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}>🔒</span>
              <input
                type={showPass ? "text" : "password"}
                placeholder="كلمة المرور"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ ...inp, paddingRight: "42px", paddingLeft: "42px" }}
                dir="ltr"
              />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute", top: "50%", left: "12px", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#666",
                  fontSize: "14px", padding: "2px",
                }}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading
                ? "rgba(212,175,55,0.4)"
                : "linear-gradient(135deg, #D4AF37 0%, #c9a227 100%)",
              color: "#000", border: "none", borderRadius: "14px",
              fontWeight: "bold", fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 20px rgba(212,175,55,0.3)",
              marginBottom: "16px",
            }}
            onMouseEnter={e => !loading && ((e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)")}
            onMouseLeave={e => !loading && ((e.currentTarget as HTMLButtonElement).style.transform = "none")}
          >
            {loading ? "جاري التحميل..." : authMode === "login" ? "دخول ✨" : "إنشاء الحساب 🎉"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "#222" }} />
            <span style={{ color: "#555", fontSize: "12px" }}>أو</span>
            <div style={{ flex: 1, height: "1px", background: "#222" }} />
          </div>

          {/* Guest button */}
          <button
            onClick={close}
            style={{
              width: "100%", padding: "12px",
              background: "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: "14px",
              color: "#888", fontSize: "14px", cursor: "pointer",
              transition: "all 0.2s", marginBottom: "20px",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#ccc"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#888"; }}
          >
            متابعة كضيف 👤
          </button>

          {/* Switch mode */}
          <p style={{ textAlign: "center", color: "#666", fontSize: "13px", margin: 0 }}>
            {authMode === "login" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
            <span
              onClick={() => switchMode(authMode === "login" ? "register" : "login")}
              style={{ color: "#D4AF37", cursor: "pointer", fontWeight: "bold" }}
            >
              {authMode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}
            </span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #2a2a2a",
  background: "rgba(255,255,255,0.04)",
  color: "white", fontSize: "14px",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.2s",
};
