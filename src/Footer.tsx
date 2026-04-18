import { useNavigate } from "react-router-dom";

const WA = import.meta.env.VITE_WHATSAPP_NUMBER;

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer style={{
      background: "#080b14",
      borderTop: "1px solid #1a1a1a",
      padding: "40px 20px 24px",
      direction: "rtl",
      marginTop: "60px",
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Top row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "32px",
          marginBottom: "36px",
        }}>
          {/* Brand */}
          <div>
            <h3 style={{ color: "#D4AF37", fontSize: "20px", margin: "0 0 10px", fontWeight: "bold" }}>
              💍 العقيلة
            </h3>
            <p style={{ color: "#555", fontSize: "13px", lineHeight: "1.7", margin: 0 }}>
              أفخم الخواتم والإكسسوارات المختارة بعناية.
              نوصل لكل البحرين 🇧🇭
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 style={{ color: "#888", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 14px" }}>
              روابط سريعة
            </h4>
            {[
              { label: "الرئيسية", path: "/" },
              { label: "المتجر", path: "/shop" },
              { label: "عن العقيلة", path: "/about" },
              { label: "تتبع طلب", path: "/track" },
            ].map(({ label, path }) => (
              <div
                key={path}
                onClick={() => navigate(path)}
                style={{ color: "#666", fontSize: "13px", padding: "4px 0", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#D4AF37")}
                onMouseLeave={e => (e.currentTarget.style.color = "#666")}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: "#888", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 14px" }}>
              تواصل معنا
            </h4>
            <a
              href={`https://wa.me/${WA}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "8px", color: "#25D366", fontSize: "13px", textDecoration: "none", padding: "4px 0" }}
            >
              💬 واتساب
            </a>
            <a
              href={`https://instagram.com`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c13584", fontSize: "13px", textDecoration: "none", padding: "4px 0" }}
            >
              📸 إنستغرام
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: "1px solid #151515",
          paddingTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}>
          <p style={{ color: "#333", fontSize: "12px", margin: 0 }}>
            © {new Date().getFullYear()} العقيلة — جميع الحقوق محفوظة
          </p>
          <p style={{ color: "#333", fontSize: "12px", margin: 0 }}>
            صُنع بـ ❤️ في البحرين 🇧🇭
          </p>
        </div>
      </div>
    </footer>
  );
}
