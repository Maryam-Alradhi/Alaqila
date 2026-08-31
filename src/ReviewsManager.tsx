import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { useToast } from "./Toast";

const statusLabels: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" };
const statusColors: Record<string, string> = { pending: "#f59e0b", approved: "#22c55e", rejected: "#ef4444" };

export default function ReviewsManager() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const load = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")));
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { showToast("خطأ في التحميل", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "reviews", id), { status });
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      showToast(status === "approved" ? "تم اعتماد التقييم ✅" : "تم رفض التقييم", status === "approved" ? "success" : "info");
    } catch { showToast("فشل التحديث", "error"); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("حذف هذا التقييم نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, "reviews", id));
      setReviews(prev => prev.filter(r => r.id !== id));
      showToast("تم الحذف", "info");
    } catch { showToast("فشل الحذف", "error"); }
  };

  const filtered = filter === "all" ? reviews : reviews.filter(r => r.status === filter);
  const pendingCount = reviews.filter(r => r.status === "pending").length;

  if (loading) return <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>جاري التحميل...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
        {(["pending", "approved", "rejected", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className="btn-3d"
            style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: `1px solid ${filter === f ? "var(--gold)" : "var(--border)"}`, background: filter === f ? "var(--gold-dim)" : "transparent", color: filter === f ? "var(--gold)" : "var(--text-muted)", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "inherit" }}>
            {f === "all" ? "الكل" : statusLabels[f]}
            {f === "pending" && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
        <button onClick={load} className="btn-3d"
          style={{ padding: "8px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer" }}>🔄</button>
      </div>

      {filtered.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>لا توجد تقييمات</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(r => (
            <div key={r.id} className="card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                <div>
                  <p style={{ color: "var(--gold)", fontWeight: "700", fontSize: "13px", margin: 0 }}>{r.productName || "منتج محذوف"}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "4px 0 0" }}>
                    {r.userName || "عميل"} · {"⭐".repeat(Number(r.rating) || 0)} · {r.createdAt?.toDate?.()?.toLocaleDateString("ar-BH") || "—"}
                  </p>
                </div>
                <span style={{ background: statusColors[r.status] + "22", color: statusColors[r.status], padding: "4px 12px", borderRadius: "20px", fontSize: "11px", border: `1px solid ${statusColors[r.status]}44`, fontWeight: "700" }}>
                  {statusLabels[r.status] || r.status}
                </span>
              </div>
              {r.comment && (
                <p style={{ color: "var(--text-dim)", fontSize: "13px", margin: "10px 0 0", lineHeight: 1.7 }}>{r.comment}</p>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                {r.status !== "approved" && (
                  <button onClick={() => setStatus(r.id, "approved")} className="btn-3d"
                    style={{ padding: "6px 14px", background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                    ✅ اعتماد
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => setStatus(r.id, "rejected")} className="btn-3d"
                    style={{ padding: "6px 14px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                    🚫 رفض
                  </button>
                )}
                <button onClick={() => remove(r.id)} className="btn-3d"
                  style={{ padding: "6px 14px", background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                  🗑️ حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
