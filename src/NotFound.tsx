import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh", background: "#0B0F1A",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      direction: "rtl", padding: "20px", textAlign: "center",
    }}>
      <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ marginBottom: "20px", opacity: 0.5 }}>
        <circle cx="50" cy="56" r="28" stroke="#D4AF37" strokeWidth="4.5" fill="none"/>
        <circle cx="50" cy="56" r="16" stroke="#D4AF3755" strokeWidth="2" fill="none" strokeDasharray="5 4"/>
        <path d="M37 23 Q50 15 63 23" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <circle cx="50" cy="15" r="5" fill="#D4AF37"/>
      </svg>

      <h1 className="font-display" style={{ color: "#D4AF37", fontSize: "clamp(64px,15vw,100px)", margin: 0, lineHeight: 1, fontWeight: "900" }}>
        404
      </h1>
      <p style={{ color: "#888", fontSize: "18px", margin: "12px 0 6px" }}>هذه الصفحة غير موجودة</p>
      <p style={{ color: "#444", fontSize: "13px", marginBottom: "36px" }}>تأكد من الرابط أو عُد للرئيسية</p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => navigate("/")} className="btn-3d"
          style={{ padding: "12px 28px", background: "#D4AF37", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", color: "#000" }}>
          الرئيسية 🏠
        </button>
        <button onClick={() => navigate("/shop")} className="btn-3d"
          style={{ padding: "12px 28px", background: "transparent", border: "1px solid #333", borderRadius: "12px", cursor: "pointer", fontSize: "14px", color: "#aaa" }}>
          المتجر 🛍️
        </button>
      </div>
    </div>
  );
}
