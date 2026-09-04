import logo from "./assets/Logo.png";
import shopHeroVideo from "./assets/home-page.mp4";
import allCatIcon from "./assets/icons/all.png";
import ringsCatIcon from "./assets/icons/rings.png";
import necklaceCatIcon from "./assets/icons/necklace.png";
import braceletCatIcon from "./assets/icons/bracelets.png";
import customizationCatIcon from "./assets/icons/customization.png";
import appleIcon from "./assets/icons/apple.png";
import androidIcon from "./assets/icons/android.png";
import qualityIcon from "./assets/icons/quality.png";
import uniqueDesignsIcon from "./assets/icons/unique-designs.png";
import fastDeliveryIcon from "./assets/icons/fast-delivery.png";
import whatsappIcon from "./assets/icons/whatsapp.png";
import { useEffect, useState, useContext, useRef, useMemo } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Product from "./Product";
import Cart from "./Cart";
import { CartContext } from "./CartContext";
import Wishlist from "./Wishlist";
import { WishlistContext } from "./WishlistContext";
import Checkout from "./Checkout";
import Admin from "./Admin";
import AdminLogin from "./AdminLogin";
import TrackOrder from "./TrackOrder";
import About from "./About";
import Help from "./Help";
import NotFound from "./NotFound";
import Footer from "./Footer";
import Login from "./Login";
import Profile from "./Profile";
import Orders from "./Orders";
import { useAuth } from "./AuthContext";
import { getActiveDiscount, getDiscountedPrice } from "./pricing";
import { getCoverMedia } from "./media";

// ✅ Module-level products cache — survives re-renders, cleared on page reload
let _productsCache: any[] | null = null;
let _categoriesCache: any[] | null = null;

const DEFAULT_CATS = [
  { value:"all",      label:"الكل" },
  { value:"rings",    label:"خواتم" },
  { value:"necklace", label:"سلاسل" },
  { value:"bracelet", label:"أساور" },
  { value:"misbaha",  label:"مسابيح", icon:"📿" },
  { value:"other",    label:"أخرى", icon:"✨" },
];

const CAT_ICONS: Record<string,string> = {
  rings: ringsCatIcon,
  necklace: necklaceCatIcon,
  bracelet: braceletCatIcon,
  bracelets: braceletCatIcon,
};

// ✅ نضمن ظهور "مسابيح" و"أخرى" بتبويبات المتجر حتى لو مستند إعدادات الأقسام بفايرستور ما تحدّث بعد
const ensureMisbaha = (cats: any[]) => {
  let result = cats.some(c => c.value === "misbaha") ? cats : [...cats, { value:"misbaha", label:"مسابيح", icon:"📿" }];
  result = result.some(c => c.value === "other") ? result : [...result, { value:"other", label:"أخرى", icon:"✨" }];
  return result;
};

function App() {
  const [products, setProducts] = useState<any[]>(_productsCache ?? []);
  const [productsLoading, setProductsLoading] = useState(_productsCache === null);
  const [categories, setCategories] = useState<any[]>(ensureMisbaha(_categoriesCache ?? DEFAULT_CATS.slice(1)));
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("all");
  const [dropdown, setDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const { cart } = useContext(CartContext);
  const { wishlist, isWishlisted, toggleWishlist } = useContext(WishlistContext);
  const { user, profile, isAdmin, loading: authLoading, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // ✅ التنقّل بين الصفحات بالموقع (SPA) ما يرجّع السكرول لفوق تلقائياً زي الصفحات العادية —
  // نسوّيها يدوياً كل ما يتغيّر المسار، وإلا أي رابط تضغطينه من الفوتر (بالأسفل) يوديك لصفحة
  // جديدة وانتِ لسا بالأسفل بدل ما تشوفين بداية الصفحة
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    // ✅ Skip fetch if already cached
    if (_productsCache !== null) return;
    getDocs(collection(db, "products"))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _productsCache = data;
        setProducts(data);
      })
      .catch(e => console.error(e))
      .finally(() => setProductsLoading(false));
  }, []);

  // ✅ Load categories from store settings
  useEffect(() => {
    if (_categoriesCache !== null) { setCategories(ensureMisbaha(_categoriesCache)); return; }
    getDoc(doc(db, "settings", "store")).then(snap => {
      if (snap.exists() && snap.data().categories) {
        _categoriesCache = ensureMisbaha(snap.data().categories);
        setCategories(_categoriesCache!);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdown(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ✅ Fix: useMemo so filtering doesn't recompute on every render
  // ⚠️ لازم يبقى قبل أي return مبكر — أي هوك بعد return شرطي يسبب "Rendered more/fewer hooks" ويكسر الصفحة كاملة
  // بالضبط وقت التنقّل بين مسار الأدمن ومسار عادي (تسجيل الدخول/الخروج) بدون إعادة تحميل الصفحة
  const filteredProducts = useMemo(() =>
    products
      .filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
      .filter(p => category === "all" ? true : category === "customized" ? !!p.customizable : p.category === category),
    [products, search, category]
  );

  const isAdminRoute = location.pathname.startsWith("/manage-store-aqeela");
  if (isAdminRoute) {
    // ✅ isAdmin يعتمد بس على user.email — ما نحتاج ننتظر البروفايل هنا (لو فشل جلبه لأي سبب، ما نبي الأدمن يعلق على شاشة تحميل للأبد)
    if (authLoading) return (
      <div style={{ minHeight: "100vh", background: "#0B0F1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:"40px", height:"40px", border:"3px solid #1a1a2e", borderTop:"3px solid #D4AF37", borderRadius:"50%", margin:"0 auto 14px", animation:"spin 0.8s linear infinite" }} />
          <div style={{ color: "#D4AF37", fontSize: "15px" }}>جاري التحقق...</div>
        </div>
      </div>
    );
    return isAdmin ? <Admin /> : <AdminLogin />;
  }

  const hideNavOn  = ["/", "/login"];
  const showNavbar = !hideNavOn.includes(location.pathname);
  const showFooter = !hideNavOn.includes(location.pathname);

  const initial = user ? (profile?.name || user.email || "؟")[0].toUpperCase() : null;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", direction: "rtl" }}>

      {/* ── Navbar ── */}
      {showNavbar && (
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(8,8,8,0.78)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          borderBottom: "1px solid var(--gold-border)",
          boxShadow: "0 1px 24px rgba(0,0,0,0.35)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            maxWidth: "1360px", margin: "0 auto",
            padding: "0 24px", height: "72px",
          }}>
            {/* Brand */}
            <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
              <img src={logo} alt="logo" style={{ height: "42px", width: "42px", objectFit: "cover", borderRadius: "12px", border: "1.5px solid var(--gold-border)", boxShadow: "0 0 16px rgba(184,150,46,0.18)" }} />
              <span className="hide-mobile gold-shimmer font-display" style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "0.02em" }}>العقيلة</span>
            </div>

            {/* Center nav links - desktop */}
            <div className="hide-mobile" style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "999px", padding: "5px" }}>
              {[
                ["/shop",  "المتجر"],
                ["/about", "عن العقيلة"],
                ["/track", "تتبع طلب"],
              ].map(([path, label]) => (
                <button key={path} onClick={() => navigate(path)} className="btn-3d"
                  style={{ padding: "8px 18px", background: location.pathname === path ? "var(--gold-dim)" : "transparent", border: "none", color: location.pathname === path ? "var(--gold)" : "var(--text-muted)", cursor: "pointer", fontSize: "13px", fontWeight: location.pathname === path ? "700" : "500", borderRadius: "999px", transition: "var(--transition)", fontFamily: "inherit" }}
                  onMouseEnter={e => { if (location.pathname !== path) e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { if (location.pathname !== path) e.currentTarget.style.color = "var(--text-muted)"; }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Right side */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {/* Search - desktop */}
              <div className="hide-mobile" style={{ position: "relative" }}>
                <span style={{ position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "13px" }}>🔍</span>
                <input
                  placeholder="ابحث..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ padding: "9px 38px 9px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "999px", color: "var(--text)", fontSize: "13px", width: "170px", outline: "none", fontFamily: "inherit", transition: "var(--transition)", boxShadow: "inset 0 2px 5px rgba(0,0,0,0.3)" }}
                  onFocus={e => { e.target.style.borderColor = "var(--gold-border)"; e.target.style.background = "rgba(184,150,46,0.05)"; e.target.style.width = "210px"; }}
                  onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.width = "170px"; }}
                />
              </div>

              {/* User dropdown */}
            {user ? (
              <div ref={dropRef} style={{ position: "relative" }}>
                <button onClick={() => setDropdown(!dropdown)} className="btn-3d"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: dropdown ? "var(--gold-dim)" : "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "10px", cursor: "pointer", transition: "var(--transition)" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold-border)"}
                  onMouseLeave={e => !dropdown && (e.currentTarget.style.borderColor = "var(--border)")}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#D4AF37,#a07020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "900", color: "#000", flexShrink: 0 }}>
                    {initial}
                  </div>
                  <span className="hide-mobile" style={{ color: "var(--text)", fontSize: "13px", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {profile?.name || user.email?.split("@")[0]}
                  </span>
                  {profile && profile.balance > 0 && (
                    <span style={{ background: "var(--gold-dim)", color: "var(--gold)", fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "99px", border: "1px solid var(--gold-border)" }}>
                      {profile.balance.toFixed(2)} BD
                    </span>
                  )}
                  <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>▾</span>
                </button>

                {dropdown && (
                  <div className="animate-slideDown" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: "#0d1120", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px", minWidth: "180px", boxShadow: "0 16px 40px rgba(0,0,0,0.6)", zIndex: 200 }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", marginBottom: "6px" }}>
                      <p style={{ color: "var(--text)", fontSize: "13px", fontWeight: "700", margin: 0 }}>{profile?.name || "مستخدم"}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: "2px 0 0" }}>{user.email}</p>
                    </div>

                    {[
                      { icon: "👤", label: "ملفي الشخصي", path: "/profile" },
                      { icon: "📦", label: "طلباتي",       path: "/orders" },
                      { icon: "🛒", label: "السلة",        path: "/cart" },
                    ].map(item => (
                      <button key={item.path} onClick={() => { navigate(item.path); setDropdown(false); }} className="btn-3d"
                        style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", borderRadius: "8px", transition: "var(--transition)", fontFamily: "inherit", textAlign: "right" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span>{item.icon}</span>{item.label}
                      </button>
                    ))}

                    <div style={{ borderTop: "1px solid var(--border)", marginTop: "6px", paddingTop: "6px" }}>
                      <button onClick={async () => { await logout(); setDropdown(false); navigate("/"); }} className="btn-3d"
                        style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", borderRadius: "8px", transition: "var(--transition)", fontFamily: "inherit", textAlign: "right" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        🚪 تسجيل الخروج
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("/login")} className="btn-3d"
                style={{ padding: "8px 18px", background: "linear-gradient(135deg,#D4AF37,#b8942a)", color: "#000", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                دخول / تسجيل
              </button>
            )}

            {/* Wishlist */}
            <button onClick={() => navigate("/wishlist")} className="btn-3d"
              style={{ position: "relative", width: "40px", height: "40px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "10px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              💛
              {wishlist.length > 0 && (
                <span style={{ position: "absolute", top: "-4px", left: "-4px", background: "var(--gold)", color: "#000", borderRadius: "50%", width: "16px", height: "16px", fontSize: "9px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart */}
            <button onClick={() => navigate("/cart")} className="btn-3d"
              style={{ position: "relative", width: "40px", height: "40px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "10px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              🛒
              {cart.length > 0 && (
                <span style={{ position: "absolute", top: "-4px", left: "-4px", background: "var(--gold)", color: "#000", borderRadius: "50%", width: "16px", height: "16px", fontSize: "9px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", animation: "notifyPop 0.3s ease" }}>
                  {cart.length}
                </span>
              )}
            </button>
            </div>
          </div>
        </nav>
      )}

      {/* ── Routes ── */}
      <Routes>
        <Route path="/"    element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Shop */}
        <Route path="/shop" element={
          <div className="animate-fadeIn">
            {/* Full-width hero — video background, content overlaid */}
            <div className="shine-sweep" style={{ position: "relative", width: "100%", minHeight: "300px", overflow: "hidden" }}>
              <video src={shopHeroVideo} autoPlay loop muted playsInline
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,6,6,0.55) 0%, rgba(6,6,6,0.3) 45%, rgba(6,6,6,0.8) 100%)" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.06)", mixBlendMode: "overlay" }} />

              <div style={{
                position: "relative", zIndex: 2, padding: "44px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                textAlign: "center", gap: "12px",
              }}>
                <h2 className="font-display" style={{ color: "var(--gold)", fontSize: "clamp(24px,4vw,34px)", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "8px", textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                  لمسة تعكس ذوقك <span style={{ fontSize: "22px" }}>💎</span>
                </h2>
                <p style={{ color: "rgba(237,232,223,0.85)", fontSize: "14px", margin: 0 }}>
                  جودة عالية .. تصاميم راقية .. تفصيل حسب طلبك
                </p>
                <div style={{ display: "flex", gap: "10px", marginTop: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                  {[["https://apps.apple.com/bh/app/ring-sizer-by-jason-withers/id795721582","App Store",appleIcon],["https://play.google.com/store/apps/details?id=ru.cherrydesign.ringsizer","Google Play",androidIcon]].map(([url,label,icon])=>(
                    <a key={label} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <div className="btn-3d" style={{ display:"flex", alignItems:"center", gap:"6px", background: "rgba(0,0,0,0.55)", border: "1px solid #333", borderRadius: "10px", padding: "9px 18px", cursor: "pointer", color: "white", fontSize: "12px", fontWeight: "700" }}>
                        <img src={icon} alt="" style={{ width:"14px", height:"14px", objectFit:"contain", filter:"invert(1)" }} />{label}
                      </div>
                    </a>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "26px", marginTop: "18px", flexWrap: "wrap", justifyContent: "center" }}>
                  {[[qualityIcon,"جودة مضمونة",0],[uniqueDesignsIcon,"تصاميم فريدة",0.4],[fastDeliveryIcon,"شحن سريع وآمن",0.8]].map(([icon,label,delay]) => (
                    <div key={label as string} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="icon-badge-3d" style={{ width: "38px", height: "38px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0, animationDelay: `${delay}s` }}>
                        <img src={icon as string} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                      </div>
                      <span style={{ color: "rgba(237,232,223,0.85)", fontSize: "13px", fontWeight: "600" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: "24px 16px" }}>

            {/* Mobile search */}
            <div className="hide-desktop" style={{ marginBottom: "16px" }}>
              <input className="inp" placeholder="🔍 ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Categories — loaded from store settings */}
            <div style={{ display:"flex", justifyContent:"center", gap:"8px", marginBottom:"24px", flexWrap:"wrap" }}>
              <button onClick={() => setCategory("all")} className="btn-3d"
                style={{ padding:"9px 18px", borderRadius:"99px", border:`1.5px solid ${category==="all"?"var(--gold)":"var(--border)"}`, background:category==="all"?"var(--gold)":"transparent", color:category==="all"?"#000":"var(--text-muted)", fontWeight:"700", cursor:"pointer", fontSize:"13px", transition:"var(--transition)", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:"6px" }}>
                <img src={allCatIcon} alt="" style={{ width:"15px", height:"15px", objectFit:"contain", filter:category==="all"?"none":"invert(1)" }} />
                الكل
              </button>
              {categories.map(cat => (
                <button key={cat.value} onClick={() => setCategory(cat.value)} className="btn-3d"
                  style={{ padding:"9px 18px", borderRadius:"99px", border:`1.5px solid ${category===cat.value?"var(--gold)":"var(--border)"}`, background:category===cat.value?"var(--gold)":"transparent", color:category===cat.value?"#000":"var(--text-muted)", fontWeight:"700", cursor:"pointer", fontSize:"13px", transition:"var(--transition)", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:"6px" }}>
                  {CAT_ICONS[cat.value]
                    ? <img src={CAT_ICONS[cat.value]} alt="" style={{ width:"15px", height:"15px", objectFit:"contain", filter:category===cat.value?"none":"invert(1)" }} />
                    : cat.icon}
                  {cat.label}
                </button>
              ))}
              <button onClick={() => setCategory("customized")} className="btn-3d"
                style={{ padding:"9px 18px", borderRadius:"99px", border:`1.5px solid ${category==="customized"?"var(--gold)":"var(--border)"}`, background:category==="customized"?"var(--gold)":"transparent", color:category==="customized"?"#000":"var(--text-muted)", fontWeight:"700", cursor:"pointer", fontSize:"13px", transition:"var(--transition)", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:"6px" }}>
                <img src={customizationCatIcon} alt="" style={{ width:"15px", height:"15px", objectFit:"contain", filter:category==="customized"?"none":"invert(1)" }} />
                صياغة حسب الطلب
              </button>
            </div>

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "20px", maxWidth: "1100px", margin: "0 auto" }}>
              {productsLoading ? (
                Array.from({length: 6}).map((_,i) => (
                  <div key={i} style={{ borderRadius: "14px", overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div className="skeleton" style={{ height: "200px" }} />
                    <div style={{ padding: "12px" }}>
                      <div className="skeleton" style={{ height: "14px", width: "70%", marginBottom: "8px" }} />
                      <div className="skeleton" style={{ height: "12px", width: "40%" }} />
                    </div>
                  </div>
                ))
              ) : filteredProducts.length === 0 ? (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px" }}>
                  <div style={{ fontSize: "52px", marginBottom: "12px" }}>😢</div>
                  <p style={{ color: "var(--text-muted)" }}>لا توجد منتجات مطابقة</p>
                </div>
              ) : filteredProducts.map((product, i) => {
                // ✅ منتج مصنوع حسب الطلب ما يخضع لمخزون — دايماً متاح، بدون بادج "نفذ" أو "باقي كذا"
                const soldOut = product.customizable ? false : product.sizes ? Object.values(product.sizes).every((q:any) => Number(q)===0) : Number(product.quantity??0)===0;
                const stockNum = product.sizes ? Object.values(product.sizes).reduce((s:number,q:any) => s+Number(q),0) : Number(product.quantity??0);
                const lowStock = !product.customizable && !soldOut && stockNum <= 3;
                return (
                  <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                    className="product-card animate-slideUp"
                    style={{ animationDelay: `${i * 0.04}s` }}>
                    {/* ✅ كل البادجات (فوق وتحت) لازم تكون بحاوية بحدود الصورة بس، وإلا "bottom" يتمدد
                        لحدود الكارد كامل ويطلع فوق السعر (كان هذا سبب اختفاء السعر) */}
                    <div style={{ position: "relative" }}>
                      <button onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }} className="btn-3d"
                        style={{ position: "absolute", top: "8px", right: "8px", zIndex: 2, width: "28px", height: "28px", borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)", color: isWishlisted(product.id) ? "#ef4444" : "white", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                        {isWishlisted(product.id) ? "♥" : "♡"}
                      </button>
                      {soldOut && <div className="badge-overlay badge-red">Sold Out</div>}
                      {lowStock && !soldOut && <div className="badge-overlay badge-amber">⚠️ باقي {stockNum}</div>}
                      {product.isNew && <div className="badge-overlay badge-green badge-right" style={{ top: "40px" }}>جديد ✨</div>}
                      {product.customizable && <div className="badge-overlay" style={{ top: "auto", bottom: "8px", right: "8px", left: "auto", background: "rgba(184,150,46,0.92)", color: "#000" }}>🎨 صياغة حسب الطلب</div>}
                      {["female","male","kids"].includes(product.gender) && (
                        <div className="badge-overlay" style={{ top: "auto", bottom: "8px", left: "8px", right: "auto", background: "rgba(0,0,0,0.7)", color: "white" }}>
                          {product.gender === "female" ? " نسائي" : product.gender === "male" ? " رجالي" : "👶 أطفال"}
                        </div>
                      )}
                      {(() => {
                        const cover = getCoverMedia(product);
                        if (cover?.type === "video") {
                          return <video src={cover.src} autoPlay loop muted playsInline preload="metadata" style={{ width: "100%", height: "200px", objectFit: "cover", opacity: soldOut ? 0.4 : 1, transition: "opacity 0.3s ease" }} />;
                        }
                        // ✅ Fix: lazy load images so only visible images load
                        return <img src={cover?.src || product.image} loading="lazy" decoding="async" style={{ width: "100%", height: "200px", objectFit: "cover", transition: "transform 0.4s ease, opacity 0.3s ease", opacity: soldOut ? 0.4 : 1 }} alt={product.name} />;
                      })()}
                    </div>
                    <div style={{ padding: "13px" }}>
                      <h3 style={{ color: "var(--gold)", margin: "0 0 4px", fontSize: "14px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</h3>
                      <p style={{ color: "var(--text-dim)", margin: 0, fontSize: "13px", fontWeight: "600" }}>
                        {product.category === "necklace" && Array.isArray(product.necklaceTypes) && product.necklaceTypes.length > 0 ? (
                          `يبدأ من ${Math.min(...product.necklaceTypes.map((t:any)=>Number(t.price)||0))} BD`
                        ) : getActiveDiscount(product) > 0 ? (
                          <>
                            <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "800", marginLeft: "6px" }}>-{getActiveDiscount(product)}%</span>
                            <span style={{ color: "#888", textDecoration: "line-through", fontSize: "11px", marginLeft: "4px" }}>{product.price} BD</span>
                            <span>{getDiscountedPrice(product).toFixed(3)} BD</span>
                          </>
                        ) : `${product.price} BD`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        } />

        <Route path="/product/:id"         element={<Product />} />
        <Route path="/cart"                element={<Cart />} />
        <Route path="/wishlist"            element={<Wishlist />} />
        <Route path="/checkout"            element={<Checkout />} />
        <Route path="/track"               element={<TrackOrder />} />
        <Route path="/track/:orderNumber"  element={<TrackOrder />} />
        <Route path="/about"               element={<About />} />
        <Route path="/help"                element={<Help />} />
        <Route path="/profile"             element={<Profile />} />
        <Route path="/orders"              element={<Orders />} />
        <Route path="/manage-store-aqeela" element={<div/>} />
        <Route path="*"                    element={<NotFound />} />
      </Routes>

      {showFooter && <Footer />}

      {/* WhatsApp FAB */}
      <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
        style={{ position: "fixed", bottom: "24px", left: "24px", background: "#25D366", width: "52px", height: "52px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: "0 4px 20px rgba(37,211,102,0.45)", textDecoration: "none", zIndex: 200, transition: "var(--transition)" }}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)"}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"}>
        <img src={whatsappIcon} alt="" style={{ width: "24px", height: "24px", objectFit: "contain", filter: "invert(1)" }} />
      </a>
    </div>
  );
}

export default App;
