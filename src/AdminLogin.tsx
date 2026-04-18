import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useToast } from "./Toast";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("أدخل الإيميل وكلمة المرور", "warning");
      return;
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      showToast("تم تسجيل الدخول ✅", "success");
    } catch {
      showToast("إيميل أو كلمة مرور خاطئة ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0F1A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid #222",
          borderRadius: "20px",
          padding: "40px",
          width: "100%",
          maxWidth: "380px",
          textAlign: "center",
          direction: "rtl",
        }}
      >
        <h2 style={{ color: "#D4AF37", marginBottom: "8px" }}>🔐 لوحة الأدمن</h2>
        <p style={{ color: "#666", marginBottom: "30px", fontSize: "14px" }}>
          تسجيل الدخول مطلوب
        </p>

        <input
          type="email"
          placeholder="الإيميل"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={inputStyle}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "#555" : "#D4AF37",
            color: "#000",
            border: "none",
            borderRadius: "12px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "0.2s",
          }}
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#0B0F1A",
  color: "white",
  fontSize: "14px",
  boxSizing: "border-box",
  direction: "ltr",
  textAlign: "left",
};

export default AdminLogin;
