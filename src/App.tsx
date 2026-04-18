import logo from "./assets/Logo.jpeg";
import { useEffect, useState, useContext, useRef, useMemo } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Product from "./Product";
import Cart from "./Cart";
import { CartContext } from "./CartContext";
import Checkout from "./Checkout";
import Admin from "./Admin";
import AdminLogin from "./AdminLogin";
import TrackOrder from "./TrackOrder";
import About from "./About";
import NotFound from "./NotFound";
import Footer from "./Footer";
import Login from "./Login";
import Profile from "./Profile";
import Orders from "./Orders";
import { useAuth } from "./AuthContext";

// ✅ Module-level products cache — survives re-renders, cleared on page reload
let _productsCache: any[] | null = null;
let _categoriesCache: any[] | null = null;

const DEFAULT_CATS = [
  { value:"all",      label:"الكل 🌟" },
  { value:"rings",    label:"خواتم 💍" },
  { value:"necklace", label:"سلاسل 📿" },
  { value:"bracelet", label:"أساور ✨" },
];

function App() {
  const [products, setProducts] = useState<any[]>(_productsCache ?? []);
  const [productsLoading, setProductsLoading] = useState(_productsCache === null);
  const [categories, setCategories] = useState<any[]>(_categoriesCache ?? DEFAULT_CATS.slice(1));
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("all");
  const [dropdown, setDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const { cart } = useContext(CartContext);
  const { user, profile, isAdmin, loading: authLoading, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

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
    if (_categoriesCache !== null) { setCategories(_categoriesCache); return; }
    getDoc(doc(db, "settings", "store")).then(snap => {
      if (snap.exists() && snap.data().categories) {
        _categoriesCache = snap.data().categories;
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

  const isAdminRoute = location.pathname.startsWith("/manage-store-aqeela");
  if (isAdminRoute) {
    // انتظر حتى يكتمل تحميل الـ auth — يشمل جلب البروفايل من Firestore
    if (authLoading || (user && !profile)) return (
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

  // ✅ Fix: useMemo so filtering doesn't recompute on every render
  const filteredProducts = useMemo(() =>
    products
      .filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
      .filter(p => category === "all" ? true : p.category === category),
    [products, search, category]
  );

  const initial = user ? (profile?.name || user.email || "؟")[0].toUpperCase() : null;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", direction: "rtl" }}>

      {/* ── Navbar ── */}
      {showNavbar && (
        <nav style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0 20px", height: "64px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(8,11,20,0.95)",
          backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          {/* Logo */}
          <img src={logo} onClick={() => navigate("/")} style={{ height: "50px", cursor: "pointer", borderRadius: "50%", border: "1.5px solid var(--gold-border)" }} alt="logo" />

          {/* Center nav links - desktop */}
          <div className="hide-mobile" style={{ display: "flex", gap: "4px" }}>
            {[
              ["/shop",  "المتجر"],
              ["/about", "عن العقيلة"],
              ["/track", "تتبع طلب"],
            ].map(([path, label]) => (
              <button key={path} onClick={() => navigate(path)}
                style={{ padding: "8px 14px", background: "transparent", border: "none", color: location.pathname === path ? "var(--gold)" : "var(--text-muted)", cursor: "pointer", fontSize: "13px", fontWeight: location.pathname === path ? "700" : "400", borderRadius: "8px", transition: "var(--transition)", fontFamily: "inherit", position: "relative" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
                onMouseLeave={e => e.currentTarget.style.color = location.pathname === path ? "var(--gold)" : "var(--text-muted)"}>
                {label}
                {location.pathname === path && <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: "20px", height: "2px", background: "var(--gold)", borderRadius: "99px" }} />}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Search - desktop */}
            <div className="hide-mobile" style={{ position: "relative" }}>
              <span style={{ position: "absolute", top: "50%", right: "12px", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "13px" }}>🔍</span>
              <input
                placeholder="ابحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: "8px 36px 8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "13px", width: "160px", outline: "none", fontFamily: "inherit", transition: "var(--transition)" }}
                onFocus={e => { e.target.style.borderColor = "var(--gold-border)"; e.target.style.width = "200px"; }}
                onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.width = "160px"; }}
              />
            </div>

            {/* User dropdown */}
            {user ? (
              <div ref={dropRef} style={{ position: "relative" }}>
                <button onClick={() => setDropdown(!dropdown)}
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
                      <button key={item.path} onClick={() => { navigate(item.path); setDropdown(false); }}
                        style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", borderRadius: "8px", transition: "var(--transition)", fontFamily: "inherit", textAlign: "right" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span>{item.icon}</span>{item.label}
                      </button>
                    ))}

                    <div style={{ borderTop: "1px solid var(--border)", marginTop: "6px", paddingTop: "6px" }}>
                      <button onClick={async () => { await logout(); setDropdown(false); navigate("/"); }}
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
              <button onClick={() => navigate("/login")}
                style={{ padding: "8px 18px", background: "linear-gradient(135deg,#D4AF37,#b8942a)", color: "#000", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", boxShadow: "0 2px 12px rgba(212,175,55,0.2)", transition: "var(--transition)" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                دخول / تسجيل
              </button>
            )}

            {/* Cart */}
            <button onClick={() => navigate("/cart")}
              style={{ position: "relative", width: "40px", height: "40px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "10px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", transition: "var(--transition)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold-border)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
              🛒
              {cart.length > 0 && (
                <span style={{ position: "absolute", top: "-4px", left: "-4px", background: "var(--gold)", color: "#000", borderRadius: "50%", width: "16px", height: "16px", fontSize: "9px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", animation: "notifyPop 0.3s ease" }}>
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </nav>
      )}

      {/* ── Routes ── */}
      <Routes>
        <Route path="/"    element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Shop */}
        <Route path="/shop" element={
          <div style={{ padding: "24px 16px" }} className="animate-fadeIn">
            {/* Ring sizer */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
              <div style={{ background: "linear-gradient(135deg,#0e1225,#141b30)", border: "1px solid var(--gold-border)", borderRadius: "18px", padding: "16px 24px", boxShadow: "var(--shadow-gold)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", maxWidth: "420px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <svg width="36" height="36" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="24" r="13" stroke="#D4AF37" strokeWidth="2.5" fill="none"/><circle cx="22" cy="24" r="7.5" stroke="#D4AF3788" strokeWidth="1.5" fill="none" strokeDasharray="3 2.5"/><path d="M16 10 Q22 6 28 10" stroke="#D4AF37" strokeWidth="2.2" strokeLinecap="round" fill="none"/><circle cx="22" cy="7.5" r="2.5" fill="#D4AF37"/></svg>
                  <div>
                    <p style={{ color: "var(--gold)", fontWeight: "700", fontSize: "14px", margin: 0 }}>💍 قيس مقاس خاتمك</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "2px 0 0" }}>حمّل التطبيق واعرف مقاسك بدقة</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[["https://apps.apple.com/bh/app/ring-sizer-by-jason-withers/id795721582","App Store"],["https://play.google.com/store/apps/details?id=ru.cherrydesign.ringsizer","Google Play"]].map(([url,label])=>(
                    <a key={label} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid #333", borderRadius: "10px", padding: "7px 14px", cursor: "pointer", color: "white", fontSize: "12px", fontWeight: "700", transition: "var(--transition)" }}
                        onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.borderColor="var(--gold)"}
                        onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.borderColor="#333"}>
                        {label}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile search */}
            <div className="hide-desktop" style={{ marginBottom: "16px" }}>
              <input className="inp" placeholder="🔍 ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Categories — loaded from store settings */}
            <div style={{ display:"flex", justifyContent:"center", gap:"8px", marginBottom:"24px", flexWrap:"wrap" }}>
              <button onClick={() => setCategory("all")}
                style={{ padding:"9px 18px", borderRadius:"99px", border:`1.5px solid ${category==="all"?"var(--gold)":"var(--border)"}`, background:category==="all"?"var(--gold)":"transparent", color:category==="all"?"#000":"var(--text-muted)", fontWeight:"700", cursor:"pointer", fontSize:"13px", transition:"var(--transition)", fontFamily:"inherit" }}>
                الكل 🌟
              </button>
              {categories.map(cat => (
                <button key={cat.value} onClick={() => setCategory(cat.value)}
                  style={{ padding:"9px 18px", borderRadius:"99px", border:`1.5px solid ${category===cat.value?"var(--gold)":"var(--border)"}`, background:category===cat.value?"var(--gold)":"transparent", color:category===cat.value?"#000":"var(--text-muted)", fontWeight:"700", cursor:"pointer", fontSize:"13px", transition:"var(--transition)", fontFamily:"inherit" }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
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
                const soldOut = product.sizes ? Object.values(product.sizes).every((q:any) => Number(q)===0) : Number(product.quantity??0)===0;
                const stockNum = product.sizes ? Object.values(product.sizes).reduce((s:number,q:any) => s+Number(q),0) : Number(product.quantity??0);
                const lowStock = !soldOut && stockNum <= 3;
                return (
                  <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                    className="product-card animate-slideUp"
                    style={{ animationDelay: `${i * 0.04}s` }}>
                    {soldOut && <div className="badge-overlay badge-red">Sold Out</div>}
                    {lowStock && !soldOut && <div className="badge-overlay badge-amber">⚠️ باقي {stockNum}</div>}
                    {product.isNew && <div className="badge-overlay badge-green badge-right">جديد ✨</div>}
                    {product.video ? (
                      <video src={product.video} autoPlay loop muted playsInline style={{ width: "100%", height: "200px", objectFit: "cover" }} />
                    ) : (
                      // ✅ Fix: lazy load images so only visible images load
                      <img src={product.image} loading="lazy" decoding="async" style={{ width: "100%", height: "200px", objectFit: "cover", transition: "transform 0.4s ease" }} alt={product.name} />
                    )}
                    <div style={{ padding: "13px" }}>
                      <h3 style={{ color: "var(--gold)", margin: "0 0 4px", fontSize: "14px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</h3>
                      <p style={{ color: "var(--text-dim)", margin: 0, fontSize: "13px", fontWeight: "600" }}>{product.price} BD</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        } />

        <Route path="/product/:id"         element={<Product />} />
        <Route path="/cart"                element={<Cart />} />
        <Route path="/checkout"            element={<Checkout />} />
        <Route path="/track"               element={<TrackOrder />} />
        <Route path="/track/:orderNumber"  element={<TrackOrder />} />
        <Route path="/about"               element={<About />} />
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
        💬
      </a>
    </div>
  );
}

export default App;
