import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "./Toast";

const Star = ({ filled, onClick }: { filled: boolean; onClick?: () => void }) => (
  <span onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", fontSize: "20px", color: filled ? "#D4AF37" : "#444" }}>★</span>
);

export default function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibleOrderId, setEligibleOrderId] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<any | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "reviews"),
          where("productId", "==", productId),
          where("status", "==", "approved"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        if (!cancelled) setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { if (!cancelled) setReviews([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  useEffect(() => {
    if (!user) { setEligibleOrderId(null); setMyReview(null); setCheckingEligibility(false); return; }
    let cancelled = false;
    (async () => {
      setCheckingEligibility(true);
      try {
        const [ordersSnap, myReviewSnap] = await Promise.all([
          getDocs(query(collection(db, "orders"), where("userId", "==", user.uid))),
          getDocs(query(collection(db, "reviews"), where("productId", "==", productId), where("userId", "==", user.uid))),
        ]);
        if (cancelled) return;
        const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const qualifying = orders.find(o =>
          (o.status === "delivered" || o.status === "collected") &&
          Array.isArray(o.items) && o.items.some((it: any) => it.id === productId)
        );
        setEligibleOrderId(qualifying?.id || null);
        setMyReview(myReviewSnap.docs[0] ? { id: myReviewSnap.docs[0].id, ...myReviewSnap.docs[0].data() } : null);
      } catch {
        setEligibleOrderId(null);
      } finally {
        if (!cancelled) setCheckingEligibility(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, productId]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : 0;

  const submit = async () => {
    if (!user || !eligibleOrderId) return;
    if (rating < 1) { showToast("اختاري تقييمك بالنجوم أولاً ⭐", "warning"); return; }
    try {
      setSubmitting(true);
      const ref = await addDoc(collection(db, "reviews"), {
        productId,
        productName,
        userId: user.uid,
        userName: profile?.name || user.email?.split("@")[0] || "عميل",
        rating: Math.round(rating),
        comment: comment.trim(),
        orderId: eligibleOrderId,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setMyReview({ id: ref.id, rating: Math.round(rating), comment: comment.trim(), status: "pending" });
      setShowForm(false);
      showToast("شكراً لك! تقييمك راح يظهر بعد ما تتم مراجعته 🙏", "success");
    } catch {
      showToast("فشل إرسال التقييم، حاولي مرة أخرى", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: "40px", maxWidth: "860px", marginInline: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <h3 style={{ color: "#D4AF37", fontSize: "17px", margin: 0 }}>تقييمات العملاء</h3>
        {reviews.length > 0 && (
          <span style={{ color: "#aaa", fontSize: "13px" }}>
            {"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))} ({avg.toFixed(1)} من {reviews.length})
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ color: "#666", fontSize: "13px" }}>جاري تحميل التقييمات...</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: "#666", fontSize: "13px" }}>ما فيه تقييمات لهذا المنتج بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ color: "#ccc", fontSize: "13px", fontWeight: "700" }}>{r.userName || "عميل"}</span>
                <span style={{ color: "#D4AF37", fontSize: "13px" }}>{"★".repeat(Number(r.rating) || 0)}{"☆".repeat(5 - (Number(r.rating) || 0))}</span>
              </div>
              {r.comment && <p style={{ color: "#999", fontSize: "13px", margin: "8px 0 0", lineHeight: 1.7 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* منطقة إضافة تقييم — بس لعميل اشترى المنتج فعلاً واستلمه */}
      {!checkingEligibility && user && myReview && (
        <p style={{ color: myReview.status === "approved" ? "#22c55e" : "#f59e0b", fontSize: "13px" }}>
          {myReview.status === "approved" ? "✅ تقييمك منشور، شكراً لك!" : "⏳ تقييمك بانتظار المراجعة"}
        </p>
      )}
      {!checkingEligibility && user && !myReview && eligibleOrderId && (
        showForm ? (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "16px" }}>
            <p style={{ color: "#ccc", fontSize: "13px", marginBottom: "8px" }}>تقييمك:</p>
            <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} filled={n <= rating} onClick={() => setRating(n)} />
              ))}
            </div>
            <textarea className="inp" value={comment} onChange={e => setComment(e.target.value)}
              placeholder="شاركي تجربتك مع هذا المنتج (اختياري)..." rows={3} style={{ resize: "vertical", marginBottom: "12px" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={submit} disabled={submitting} className="btn-3d"
                style={{ padding: "10px 20px", background: "#D4AF37", border: "none", borderRadius: "10px", color: "#000", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-3d"
                style={{ padding: "10px 20px", background: "transparent", border: "1px solid #333", borderRadius: "10px", color: "#aaa", cursor: "pointer" }}>
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn-3d"
            style={{ padding: "10px 20px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", color: "#D4AF37", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}>
            ⭐ اكتبي تقييمك
          </button>
        )
      )}
    </div>
  );
}
