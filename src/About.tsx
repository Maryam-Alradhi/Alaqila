import { useNavigate } from "react-router-dom";
import aboutHeroVideo from "./assets/About-alaqila.mp4";

export default function About() {
  const navigate = useNavigate();

  const features = [
    { icon: "🎧", title: "خدمة عملاء مميزة", desc: "نحن هنا لخدمتك على مدار الساعة" },
    { icon: "🚚", title: "توصيل سريع",       desc: "توصيل آمن وسريع في جميع أنحاء البحرين" },
    { icon: "💎", title: "تصاميم حصرية",     desc: "تصاميم فريدة تجمع بين الأصالة والحداثة" },
    { icon: "🛡️", title: "جودة مضمونة",       desc: "نختار أجود الخامات لضمان أعلى جودة" },
  ];

  const stats = [
    { icon: "👥", value: "+10K", label: "عميل سعيد" },
    { icon: "🎁", value: "+5K",  label: "منتج فاخر" },
    { icon: "⭐", value: "98%",  label: "رضا العملاء" },
    { icon: "🏅", value: "4.8",  label: "تقييم المتجر" },
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", direction: "rtl" }}>

      {/* Hero — video background */}
      <div className="shine-sweep" style={{ position: "relative", width: "100%", minHeight: "380px", overflow: "hidden" }}>
        <video src={aboutHeroVideo} autoPlay loop muted playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,6,6,0.15) 0%, rgba(6,6,6,0.1) 45%, rgba(6,6,6,0.75) 100%)" }} />

        <span style={{ position: "absolute", top: "22%", left: "14%", zIndex: 2, color: "var(--gold)", fontSize: "18px", opacity: 0.6 }}>✦</span>
        <span style={{ position: "absolute", top: "60%", right: "12%", zIndex: 2, color: "var(--gold)", fontSize: "14px", opacity: 0.5 }}>✦</span>

        <div style={{
          position: "relative", zIndex: 2, minHeight: "380px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
          textAlign: "center", padding: "20px 20px 44px",
        }}>
          <span style={{ color: "var(--gold)", fontSize: "16px", fontWeight: "800", letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.95 }}>
            قصتنا
          </span>
          <h1 className="font-display gold-shimmer" style={{ fontSize: "clamp(30px,6vw,48px)", margin: "10px 0 16px", fontWeight: "700", textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>
            عن العقيلة
          </h1>
          <p style={{ color: "rgba(237,232,223,0.9)", fontSize: "15px", maxWidth: "500px", margin: "0 auto 32px", lineHeight: "1.9", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
            متجرك الأول للمجوهرات والإكسسوارات الفاخرة في البحرين —
            نجلب لك أرقى القطع المختارة بعناية لتُكمل أناقتك
          </p>
          <button onClick={() => navigate("/shop")} className="btn-gold">
            تصفح المتجر ✨
          </button>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ padding: "56px 20px 0", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        }}>
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="card" style={{ textAlign: "center" }}>
              <div className="icon-badge-3d" style={{ width: "54px", height: "54px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 16px" }}>
                {icon}
              </div>
              <h3 style={{ color: "var(--gold)", fontSize: "15px", margin: "0 0 8px", fontWeight: "700" }}>{title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0, lineHeight: "1.7" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ padding: "40px 20px 80px", maxWidth: "1100px", margin: "0 auto" }}>
        <div className="card" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          padding: 0, overflow: "hidden",
        }}>
          {stats.map(({ icon, value, label }, i) => (
            <div key={label} style={{
              textAlign: "center", padding: "26px 16px",
              borderInlineEnd: i < stats.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ fontSize: "26px", marginBottom: "8px" }}>{icon}</div>
              <div className="font-display" style={{ color: "var(--gold)", fontSize: "24px", fontWeight: "800" }}>{value}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Story + contact */}
      <div style={{ margin: "0 auto 80px", maxWidth: "720px", padding: "0 20px" }}>
        <div style={{
          background: "linear-gradient(135deg, var(--bg-card), #141824)",
          border: "1px solid var(--gold-border)",
          borderRadius: "var(--radius-lg)",
          padding: "46px 34px",
          textAlign: "center",
          boxShadow: "var(--shadow-gold)",
          position: "relative",
        }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: "1px", background: "linear-gradient(90deg,transparent,var(--gold),transparent)" }} />
          <h2 className="font-display" style={{ color: "var(--gold)", fontSize: "22px", margin: "0 0 18px", fontWeight: "600" }}>قصتنا ✨</h2>
          <p style={{ color: "var(--text-dim)", fontSize: "14px", lineHeight: "2", margin: "0 0 26px" }}>
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
              padding: "12px 26px",
              background: "rgba(37,211,102,0.1)",
              border: "1px solid rgba(37,211,102,0.3)",
              borderRadius: "var(--radius)",
              color: "#25D366", textDecoration: "none",
              fontSize: "14px", fontWeight: "700",
              transition: "var(--transition)",
            }}
          >
            💬 تواصل معنا على واتساب
          </a>
        </div>
      </div>
    </div>
  );
}
