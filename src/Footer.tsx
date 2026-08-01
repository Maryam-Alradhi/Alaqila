import { useNavigate } from "react-router-dom";
import whatsappIcon from "./assets/icons/whatsapp.png";
import instagramIcon from "./assets/icons/instagram.png";

const WA = import.meta.env.VITE_WHATSAPP_NUMBER;

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer style={{
      background: "var(--bg-2)",
      borderTop: "1px solid var(--gold-border)",
      padding: "48px 20px 26px",
      direction: "rtl",
      marginTop: "60px",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "32px",
          marginBottom: "36px",
        }}>
          {/* Brand */}
          <div>
            <h3 className="font-display gold-shimmer" style={{ fontSize: "22px", margin: "0 0 10px", fontWeight: "700" }}>
              💍 العقيلة
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.7", margin: 0 }}>
              أفخم الخواتم والإكسسوارات المختارة بعناية.
              نوصل لكل البحرين 🇧🇭
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 style={{ color: "var(--text-dim)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 14px" }}>
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
                style={{ color: "var(--text-muted)", fontSize: "13px", padding: "4px 0", cursor: "pointer", transition: "var(--transition)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: "var(--text-dim)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 14px" }}>
              تواصل معنا
            </h4>
            <a
              href={`https://wa.me/${WA}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "8px", color: "#25D366", fontSize: "13px", textDecoration: "none", padding: "4px 0" }}
            >
              <img src={whatsappIcon} alt="" style={{ width: "15px", height: "15px", objectFit: "contain", filter: "invert(1)" }} /> واتساب
            </a>
            <a
              href={`https://instagram.com`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c13584", fontSize: "13px", textDecoration: "none", padding: "4px 0" }}
            >
              <img src={instagramIcon} alt="" style={{ width: "15px", height: "15px", objectFit: "contain", filter: "invert(1)" }} /> إنستغرام
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: 0, opacity: 0.6 }}>
            © {new Date().getFullYear()} العقيلة — جميع الحقوق محفوظة
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: 0, opacity: 0.6 }}>
            صُنع بـ ❤️ في البحرين 🇧🇭
          </p>
        </div>
      </div>
    </footer>
  );
}
