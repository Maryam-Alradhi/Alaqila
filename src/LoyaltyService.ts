// ── Loyalty / Balance Reward Service ─────────────────────────
// Called when admin marks order as delivered or collected
import { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function awardLoyaltyBalance(order: any): Promise<string | null> {
  // Only award once per order when it's completed
  if (!order?.userId) return null;
  if (order.loyaltyAwarded) return null; // already awarded
  if (order.status !== "delivered" && order.status !== "collected") return null;

  try {
    // Get store settings
    const settingsSnap = await getDoc(doc(db, "settings", "store"));
    if (!settingsSnap.exists()) return null;

    const settings = settingsSnap.data();
    if (!settings.loyaltyEnabled) return null;

    const loyaltyPercent = Number(settings.loyaltyPercent || 0);
    const loyaltyMinOrder = Number(settings.loyaltyMinOrder || 0);

    if (loyaltyPercent <= 0) return null;
    if ((order.total || 0) < loyaltyMinOrder) return null;

    // Calculate reward
    const reward = Math.round((order.total * loyaltyPercent / 100) * 1000) / 1000;
    if (reward <= 0) return null;

    // Add balance to user
    await updateDoc(doc(db, "users", order.userId), {
      balance: increment(reward),
    });

    // Mark order as awarded
    await updateDoc(doc(db, "orders", order.id), {
      loyaltyAwarded: true,
      loyaltyAmount: reward,
    });

    // Log transaction
    await addDoc(collection(db, "loyaltyTransactions"), {
      userId: order.userId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: reward,
      type: "earned",
      description: `مكافأة طلب #${order.orderNumber}`,
      createdAt: serverTimestamp(),
    });

    return reward.toFixed(3);
  } catch (e) {
    console.error("Loyalty award error:", e);
    return null;
  }
}
