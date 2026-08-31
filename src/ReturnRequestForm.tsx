import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "./Toast";

const DAYS_15_MS = 15 * 24 * 60 * 60 * 1000;

export default function ReturnRequestForm({ order }: { order: any }) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [existing, setExisting] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "returnRequests"), where("orderId", "==", order.id)));
        if (!cancelled) setExisting(snap.docs[0] ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null);
      } catch { if (!cancelled) setExisting(null); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [order.id]);

  const isEligibleStatus = order.status === "delivered" || order.status === "collected";
  const completedAt: Date | null = order.completedAt?.toDate?.() || null;
  const withinWindow = completedAt ? (Date.now() - completedAt.getTime()) <= DAYS_15_MS : false;
  const isOwner = !!(user && order.userId && order.userId === user.uid);

  if (loading || !isEligibleStatus || !isOwner) return null;

  if (existing) {
    const msg = existing.status === "pending"
      ? "⏳ طلب الإرجاع قيد المراجعة"
      : existing.status === "approved"
        ? "✅ تمت الموافقة على طلب الإرجاع — راح نتواصل معك قريباً لإتمام الترتيب"
        : "تم رفض طلب الإرجاع، تواصلي معنا عبر واتساب لمزيد من التفاصيل";
    const color = existing.status === "pending" ? "#f59e0b" : existing.status === "approved" ? "#22c55e" : "#ef4444";
    return (
      <div style={{ background: color + "11", border: `1px solid ${color}44`, borderRadius: "var(--radius-sm)", padding: "12px 14px", color, fontSize: "13px", textAlign: "center" }}>
        {msg}
      </div>
    );
  }

  if (!withinWindow) return null;

  const submit = async () => {
    if (!user) return;
    if (!reason.trim()) { showToast("اكتبي سبب الإرجاع أو الخلل أولاً", "warning"); return; }
    try {
      setSubmitting(true);
      const ref = await addDoc(collection(db, "returnRequests"), {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.uid,
        customerName: profile?.name || order.customer?.name || "عميل",
        reason: reason.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setExisting({ id: ref.id, status: "pending", reason: reason.trim() });
      setShowForm(false);
      showToast("تم إرسال طلب الإرجاع، بانتظار المراجعة 🙏", "success");
    } catch {
      showToast("فشل الإرسال، حاولي مرة أخرى", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return showForm ? (
    <div className="card" style={{ padding: "16px" }}>
      <p className="section-title">🔁 الإبلاغ عن خلل / طلب إرجاع</p>
      <textarea className="inp" value={reason} onChange={e => setReason(e.target.value)}
        placeholder="اشرحي المشكلة أو الخلل بالمنتج..." rows={3} style={{ resize: "vertical", marginBottom: "10px" }} />
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={submit} disabled={submitting} className="btn-gold btn-3d" style={{ flex: 1, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
        </button>
        <button onClick={() => setShowForm(false)} className="btn-ghost btn-3d" style={{ flex: 1 }}>إلغاء</button>
      </div>
    </div>
  ) : (
    <button onClick={() => setShowForm(true)} className="btn-3d"
      style={{ width: "100%", padding: "12px 16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "var(--radius)", color: "#f59e0b", cursor: "pointer", fontSize: "13px", fontWeight: "700", fontFamily: "inherit" }}>
      🔁 الإبلاغ عن خلل / طلب إرجاع
    </button>
  );
}
