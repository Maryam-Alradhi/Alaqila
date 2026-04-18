import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  const values = [
    { icon: "💎", title: "جودة لا تُضاهى", desc: "كل قطعة تمر بفحص دقيق لضمان أعلى معايير الجودة والأناقة" },
    { icon: "🚗", title: "توصيل سريع", desc: "نوصل لجميع مناطق البحرين خلال 24-48 ساعة بسعر رمزي" },
    { icon: "🔒", title: "دفع آمن", desc: "ادفع كاش عند الاستلام أو عبر Benefit بكل أمان وسهولة" },
    { icon: "✨", title: "اختيار متميز", desc: "مجموعة منتقاة بعناية من أرقى الخواتم والإكسسوارات الفاخرة" },
  ];

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh", direction: "rtl" }}>

      {/* Hero */}
      <div style={{
        padding: "80px 20px 60px",
        textAlign: "center",
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 65%)",
        borderBottom: "1px solid #151515",
      }}>
        <div style={{
          width: "80px", height: "80px",
          background: "linear-gradient(135deg, #D4AF37, #a8843a)",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "32px", margin: "0 auto 20px",
          boxShadow: "0 0 40px rgba(212,175,55,0.25)",
        }}>
          💍
        </div>
        <h1 style={{ color: "#D4AF37", fontSize: "clamp(28px,6vw,44px)", margin: "0 0 14px", fontWeight: "bold" }}>
          عن العقيلة
        </h1>
        <p style={{ color: "#888", fontSize: "16px", maxWidth: "500px", margin: "0 auto 30px", lineHeight: "1.8" }}>
          متجرك الأول للمجوهرات والإكسسوارات الفاخرة في البحرين —
          نجلب لك أرقى القطع المختارة بعناية لتُكمل أناقتك
        </p>
        <button
          onClick={() => navigate("/shop")}
          style={{
            padding: "13px 36px",
            background: "#D4AF37", color: "#000",
            border: "none", borderRadius: "14px",
            fontWeight: "bold", fontSize: "15px", cursor: "pointer",
          }}
        >
          تصفح المتجر ✨
        </button>
      </div>

      {/* Values */}
      <div style={{ padding: "60px 20px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ color: "#D4AF37", textAlign: "center", marginBottom: "40px", fontSize: "22px" }}>
          لماذا العقيلة؟
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
        }}>
          {values.map(({ icon, title, desc }) => (
            <div
              key={title}
              style={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: "18px",
                padding: "28px 20px",
                textAlign: "center",
                transition: "all 0.3s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(212,175,55,0.3)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid #1e1e1e";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>{icon}</div>
              <h3 style={{ color: "#D4AF37", fontSize: "15px", margin: "0 0 8px", fontWeight: "bold" }}>{title}</h3>
              <p style={{ color: "#666", fontSize: "13px", margin: 0, lineHeight: "1.7" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Story */}
      <div style={{
        margin: "0 auto 60px",
        maxWidth: "700px",
        padding: "0 20px",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #0e1120, #111827)",
          border: "1px solid rgba(212,175,55,0.15)",
          borderRadius: "20px",
          padding: "40px 32px",
          textAlign: "center",
        }}>
          <h2 style={{ color: "#D4AF37", fontSize: "20px", margin: "0 0 16px" }}>قصتنا ✨</h2>
          <p style={{ color: "#888", fontSize: "14px", lineHeight: "1.9", margin: "0 0 20px" }}>
            بدأت العقيلة من شغف حقيقي بالجمال والأناقة. نؤمن بأن كل تفصيلة صغيرة تفرق —
            من اختيار القطعة الأولى إلى لحظة وصولها لك.
            هدفنا أن نجعل كل شخص يشعر بالثقة والتميز.
          </p>
          <a
            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "11px 24px",
              background: "#25D36622",
              border: "1px solid #25D36644",
              borderRadius: "12px",
              color: "#25D366", textDecoration: "none",
              fontSize: "14px", fontWeight: "bold",
              transition: "all 0.2s",
            }}
          >
            💬 تواصل معنا على واتساب
          </a>
        </div>
      </div>
    </div>
  );
}
