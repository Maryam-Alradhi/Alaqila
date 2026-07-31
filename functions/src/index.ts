import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

type OrderItem = {
  name?: string;
  quantity?: number;
  price?: number;
  selectedSize?: string | null;
  customization?: { label: string; value: string }[] | null;
};

// ── يبني نفس نص الرسالة اللي كان يُبنى بالمتصفح سابقاً — لكن هنا من بيانات الطلب المخزّنة فعلياً بفايرستور ──
function buildMessage(orderNumber: string, order: any): string {
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];

  const itemsList = items.map(item => {
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 0);
    const custLines = Array.isArray(item.customization) && item.customization.length
      ? "\n" + item.customization.map(c => `   🎨 ${c.label}: ${c.value}`).join("\n")
      : "";
    return `• ${item.name || ""}${item.selectedSize ? ` (م${item.selectedSize})` : ""} × ${qty} — ${(price * qty).toFixed(3)} BD${custLines}`;
  }).join("\n");

  const isDelivery = order.deliveryType === "delivery";
  const delivLine = isDelivery
    ? `📍 *العنوان:* ${order.customer?.address || ""}\n🚗 *توصيل:* ${Number(order.deliveryFee || 0)} BD`
    : `🤝 *الاستلام:* شخصي`;
  const balanceDiscount = Number(order.balanceDiscount || 0);
  const balLine = balanceDiscount > 0 ? `\n💰 *خصم الرصيد:* -${balanceDiscount.toFixed(3)} BD` : "";
  const receiptLine = order.hasReceipt ? "\n🧾 *إيصال الدفع:* مُرفق ✅" : "";
  const paymentLabel = order.paymentMethod === "cod" ? "كاش" : order.paymentMethod === "benefit" ? "Benefit" : "رصيد";
  const total = Number(order.total || 0);

  return `🛒 *طلب جديد — ${orderNumber}*\n\n👤 *الاسم:* ${order.customer?.name || ""}\n📞 *الهاتف:* ${order.customer?.phone || ""}\n${delivLine}\n💳 *الدفع:* ${paymentLabel}${balLine}${receiptLine}\n\n📦 *المنتجات:*\n${itemsList}\n\n💰 *الإجمالي: ${total.toFixed(3)} BD*`;
}

// ── يشتغل تلقائياً كل ما ينضاف طلب جديد بفايرستور — التوكن يبقى بالسيرفر فقط، ما يوصل لجهاز العميل أبداً ──
export const notifyNewOrder = onDocumentCreated("orders/{orderId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const order = snap.data();
  if (!order) return;

  const settingsSnap = await db.doc("settings/telegram").get();
  const settings = settingsSnap.data() as { botToken?: string; chatId?: string } | undefined;
  if (!settings?.botToken || !settings?.chatId) {
    logger.warn("لا توجد إعدادات تلجرام — تجاهل الإشعار");
    return;
  }

  const orderNumber = order.orderNumber || event.params.orderId;
  const message = buildMessage(orderNumber, order);

  try {
    const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: settings.chatId, text: message, parse_mode: "Markdown" }),
    });
    if (!res.ok) logger.error("فشل إرسال رسالة تلجرام", await res.text());
  } catch (e) {
    logger.error("خطأ بإرسال رسالة تلجرام", e);
  }

  // ── إيصال الدفع (لو موجود) — يوصل مؤقتاً بالمستند لحين إرساله، وبعدين نمسحه فوراً ──
  if (order.receiptBase64) {
    try {
      const buffer = Buffer.from(order.receiptBase64 as string, "base64");
      const blob = new Blob([buffer], { type: order.receiptMime || "image/jpeg" });
      const form = new FormData();
      form.append("chat_id", settings.chatId);
      form.append("photo", blob, "receipt.jpg");
      form.append("caption", `🧾 إيصال الدفع — ${orderNumber}`);
      const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendPhoto`, { method: "POST", body: form });
      if (!res.ok) logger.error("فشل إرسال صورة الإيصال", await res.text());
    } catch (e) {
      logger.error("خطأ بإرسال صورة الإيصال", e);
    } finally {
      // ما نبي صورة الإيصال (base64) تضل محفوظة دائماً بالمستند — نمسحها بعد الإرسال
      await snap.ref.update({
        receiptBase64: FieldValue.delete(),
        receiptMime: FieldValue.delete(),
      });
    }
  }
});
