import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "./Toast";

export default function StockAlertButton({ productId, productName }: { productId: string; productName: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "stockAlerts"), where("productId", "==", productId), where("userId", "==", user.uid)));
        if (!cancelled) setSubscribed(!snap.empty);
      } catch { if (!cancelled) setSubscribed(false); }
      finally { if (!cancelled) setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, [productId, user]);

  if (checking) return null;

  if (!user) {
    return (
      <button onClick={() => navigate("/login")} className="btn-3d"
        style={{ padding: "12px 24px", borderRadius: "12px", border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer", fontWeight: "bold" }}>
        🔔 سجّلي دخولك عشان ننبهك لما يتوفر
      </button>
    );
  }

  if (subscribed) {
    return (
      <span style={{ padding: "12px 24px", borderRadius: "12px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontWeight: "bold", fontSize: "14px" }}>
        ✅ راح ننبهك لما يتوفر
      </span>
    );
  }

  const subscribe = async () => {
    try {
      setSubmitting(true);
      await addDoc(collection(db, "stockAlerts"), {
        productId, productName,
        userId: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
      });
      setSubscribed(true);
      showToast("تمام، راح نبعث لك إيميل أول ما يتوفر 🔔", "success");
    } catch {
      showToast("فشل التسجيل، حاولي مرة أخرى", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button onClick={subscribe} disabled={submitting} className="btn-3d"
      style={{ padding: "12px 24px", borderRadius: "12px", border: "1px solid #D4AF37", background: "rgba(212,175,55,0.08)", color: "#D4AF37", fontWeight: "bold", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
      {submitting ? "جاري التسجيل..." : "🔔 نبّهيني لما يتوفر"}
    </button>
  );
}
