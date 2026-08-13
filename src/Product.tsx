import { useEffect, useState, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { CartContext } from "./CartContext";
import { useToast } from "./Toast";

function Product() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const navigate = useNavigate();
  const { cart, addToCart } = useContext(CartContext);
  const { showToast } = useToast();
  const [activeImage, setActiveImage] = useState(0);
  const [customValues, setCustomValues] = useState<Record<number, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [ringSize, setRingSize] = useState("");
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setActiveImage(0);
    setRingSize("");
    getDoc(doc(db, "products", id)).then(snap => {
      if (snap.exists()) setProduct({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  if (!product)
    return <h2 style={{ color: "#D4AF37", textAlign: "center", marginTop: "80px" }}>جاري التحميل...</h2>;

  const isSoldOut = product.sizes
    ? Object.values(product.sizes).every((q: any) => Number(q) === 0)
    : Number(product.quantity ?? 0) === 0;

  // Stock level
  const stockLevel = product.sizes
    ? Object.values(product.sizes).reduce((s: number, q: any) => s + Number(q), 0)
    : Number(product.quantity ?? 0);

  const stockColor = stockLevel === 0 ? "#ef4444" : stockLevel <= 3 ? "#f59e0b" : "#22c55e";
  const stockLabel = stockLevel === 0
    ? "نفذ المخزون"
    : stockLevel <= 3
      ? `⚠️ باقي ${stockLevel} فقط!`
      : `✅ متوفر (${stockLevel} قطعة)`;

  // ✅ Check how many already in cart for this product
  const getCartQty = () => {
    return cart
      .filter((item: any) => item.id === product.id)
      .reduce((s: number, item: any) => s + (item.quantity || 0), 0);
  };

  // ✅ Get available stock — منتجات قديمة فيها مقاسات نجمعها لرقم واحد
  const getAvailableStock = (): number => {
    if (product.sizes) return Object.values(product.sizes).reduce((s: number, q: any) => s + Number(q), 0);
    return Number(product.quantity ?? 0);
  };

  const galleryImages: string[] = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image].filter(Boolean);

  // ✅ فيديو + كل الصور بمعرض واحد قابل للتنقل — الفيديو أول عنصر إذا موجود
  const mediaItems: { type: "video" | "image"; src: string }[] = [
    ...(product.video ? [{ type: "video" as const, src: product.video }] : []),
    ...galleryImages.map(src => ({ type: "image" as const, src })),
  ];
  const activeMedia = mediaItems[Math.min(activeImage, mediaItems.length - 1)];

  const goToMedia = (delta: number) => {
    setActiveImage(prev => {
      const total = mediaItems.length;
      if (total === 0) return prev;
      return ((prev + delta) % total + total) % total;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    goToMedia(dx > 0 ? -1 : 1); // سحب لليمين = السابق، سحب لليسار = التالي
  };

  const customFields: { label: string; required: boolean }[] = product.customizable && Array.isArray(product.customFields) ? product.customFields : [];

  // ✅ خواتم غير مخصصة — نطلب مقاس العميل كنص حر بدل نظام المقاسات القديم
  const needsRingSize = product.category === "rings" && !product.customizable;

  const missingRequiredField = () => customFields.some((field, i) => field.required && !customValues[i]?.trim());

  const buildCustomizationPayload = () =>
    customFields
      .map((field, i) => ({ label: field.label, value: (customValues[i] || "").trim() }))
      .filter(f => f.value !== "");

  const proceedToAddToCart = () => {
    const customization = product.customizable ? buildCustomizationPayload() : undefined;
    addToCart({
      ...product,
      ...(needsRingSize ? { selectedSize: ringSize.trim() } : {}),
      ...(customization && customization.length ? { customization } : {}),
    });
    showToast(`تمت إضافة "${product.name}" للسلة 🛒`, "success");
  };

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh", padding: "40px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{
        display: "flex", gap: "40px", flexWrap: "wrap", alignItems: "flex-start",
        background: "#111", padding: "28px", borderRadius: "20px",
        border: "1px solid #222", maxWidth: "860px", width: "100%",
      }}>
        {/* Media */}
        <div style={{ flex: "1 1 280px", maxWidth: "360px", margin: "0 auto" }}>
          {activeMedia ? (
            <>
              <div style={{ position: "relative" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {activeMedia.type === "video" ? (
                  <video key={activeMedia.src} src={activeMedia.src} autoPlay loop muted playsInline
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "14px", boxShadow: "0 0 25px rgba(212,175,55,0.25)" }} />
                ) : (
                  <img src={activeMedia.src} alt={product.name}
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "14px", boxShadow: "0 0 25px rgba(212,175,55,0.25)" }} />
                )}
                {mediaItems.length > 1 && (
                  <>
                    <button onClick={() => goToMedia(-1)} className="btn-3d"
                      style={{ position: "absolute", top: "50%", right: "8px", transform: "translateY(-50%)", width: "34px", height: "34px", borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                    <button onClick={() => goToMedia(1)} className="btn-3d"
                      style={{ position: "absolute", top: "50%", left: "8px", transform: "translateY(-50%)", width: "34px", height: "34px", borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                  </>
                )}
              </div>
              {mediaItems.length > 1 && (
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                  {mediaItems.map((m, i) => (
                    <div key={i} onClick={() => setActiveImage(i)}
                      style={{ width: "56px", height: "56px", borderRadius: "8px", cursor: "pointer", border: activeImage === i ? "2px solid #D4AF37" : "2px solid transparent", opacity: activeImage === i ? 1 : 0.65, transition: "all 0.2s", overflow: "hidden", position: "relative", background: "#000" }}>
                      {m.type === "video" ? (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🎬</div>
                      ) : (
                        <img src={m.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: "14px", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
              لا توجد صورة
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ color: "white", flex: "1 1 240px" }}>
          <h1 className="font-display" style={{ color: "#D4AF37", marginBottom: "8px", fontSize: "clamp(20px,4vw,28px)" }}>{product.name}</h1>
          <h2 style={{ color: "#ccc", marginBottom: "12px", fontSize: "clamp(16px,3vw,22px)" }}>{product.price} BD</h2>

          {/* Stock badge */}
          <span style={{
            display: "inline-block", padding: "4px 12px", borderRadius: "20px",
            background: stockColor + "22", color: stockColor,
            border: `1px solid ${stockColor}44`, fontSize: "13px",
            fontWeight: "bold", marginBottom: "16px",
          }}>
            {stockLabel}
          </span>

          {/* Ring size — free text, only for non-customized rings */}
          {needsRingSize && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px" }}>
                مقاسك <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input className="inp" value={ringSize}
                onChange={e => setRingSize(e.target.value)}
                placeholder="مثال: 17" />
            </div>
          )}

          {product.description && (
            <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px", lineHeight: "1.7", background: "#0B0F1A", padding: "12px 14px", borderRadius: "10px", border: "1px solid #1e1e1e" }}>
              {product.description}
            </p>
          )}
          {!product.description && (
            <p style={{ color: "#555", fontSize: "13px", marginBottom: "20px", lineHeight: "1.6" }}>
              قطعة أنيقة تضيف لمسة فخمة لإطلالتك ✨
            </p>
          )}

          {/* Customization fields */}
          {customFields.length > 0 && (
            <div style={{ marginBottom: "20px", background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "12px", padding: "14px" }}>
              <p style={{ color: "#D4AF37", fontSize: "13px", fontWeight: "bold", marginBottom: "10px" }}>🎨 خيارات التخصيص</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {customFields.map((field, i) => (
                  <div key={i}>
                    <label style={{ display: "block", color: "#aaa", fontSize: "12px", marginBottom: "5px" }}>
                      {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                    </label>
                    <input className="inp" value={customValues[i] || ""}
                      onChange={e => setCustomValues(v => ({ ...v, [i]: e.target.value }))}
                      placeholder={field.label} />
                  </div>
                ))}
              </div>
              <p style={{ color: "#f59e0b", fontSize: "11px", marginTop: "10px", lineHeight: "1.6" }}>
                ⏱️ يستغرق تنفيذ التخصيص من أسبوع إلى أسبوعين، وسنتواصل معك لتأكيد التفاصيل قبل التنفيذ.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {isSoldOut ? (
              <button disabled style={{ padding: "12px 28px", borderRadius: "12px", border: "none", background: "#333", color: "#666", cursor: "not-allowed", fontWeight: "bold" }}>
                Sold Out ❌
              </button>
            ) : (
              <button onClick={() => {
                if (needsRingSize && !ringSize.trim()) { showToast("أدخل مقاسك أولاً ⚠️", "warning"); return; }

                // ✅ Check stock vs cart quantity before adding
                const available = getAvailableStock();
                const inCart = getCartQty();

                if (inCart >= available) {
                  showToast(`لا يمكن إضافة أكثر من ${available} قطعة من هذا المنتج ❌`, "error");
                  return;
                }

                if (product.customizable) {
                  if (missingRequiredField()) { showToast("عبّي كل حقول التخصيص الإلزامية ⚠️", "warning"); return; }
                  setShowConfirm(true);
                  return;
                }

                proceedToAddToCart();
              }} className="btn-3d" style={{ padding: "12px 28px", borderRadius: "12px", border: "none", background: "#D4AF37", color: "#000", fontWeight: "bold", cursor: "pointer", fontSize: "15px" }}>
                {product.customizable ? "اطلب التخصيص 🎨" : "أضف للسلة 🛒"}
              </button>
            )}
            <button onClick={() => navigate("/shop")} className="btn-3d" style={{ padding: "12px 20px", borderRadius: "12px", border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer" }}>
              ← رجوع
            </button>
          </div>

          {/* ✅ Show cart qty warning */}
          {(() => {
            const available = getAvailableStock();
            const inCart = getCartQty();
            if (inCart > 0 && available > 0) {
              return (
                <p style={{ color: "#f59e0b", fontSize: "12px", marginTop: "10px" }}>
                  🛒 لديك {inCart} في السلة — متبقي {available - inCart} قطعة
                </p>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* ── Customization confirmation modal ── */}
      {showConfirm && createPortal(
        <>
          <div onClick={() => setShowConfirm(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 500 }} />
          <div style={{ position: "fixed", inset: 0, zIndex: 501, overflowY: "auto", padding: "40px 16px" }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: "#111", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "18px", padding: "26px 22px", width: "100%", maxWidth: "380px", margin: "0 auto", textAlign: "center", direction: "rtl" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>🎨</div>
              <h3 style={{ color: "#D4AF37", fontSize: "17px", marginBottom: "10px" }}>طلب تخصيص خاص</h3>
              <p style={{ color: "#ccc", fontSize: "13px", lineHeight: "1.8", marginBottom: "18px" }}>
                هذا المنتج يُصنّع حسب طلبك، ويستغرق التنفيذ من <strong style={{ color: "#D4AF37" }}>أسبوع إلى أسبوعين</strong>.
                سيتواصل معك فريقنا لتأكيد كل التفاصيل قبل البدء بالتنفيذ.
                <br />هل توافق على المتابعة؟
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowConfirm(false)} className="btn-3d"
                  style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #333", borderRadius: "10px", color: "#aaa", cursor: "pointer", fontSize: "13px" }}>
                  إلغاء
                </button>
                <button onClick={() => { setShowConfirm(false); proceedToAddToCart(); navigate("/checkout"); }} className="btn-3d"
                  style={{ flex: 1, padding: "12px", background: "#D4AF37", border: "none", borderRadius: "10px", color: "#000", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                  أوافق، أكمل الطلب ✅
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default Product;
