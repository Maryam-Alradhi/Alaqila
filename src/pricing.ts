// ✅ الخصم يصير غير فعّال تلقائياً بعد تاريخ الانتهاء (discountEndsAt) بدون أي تدخل يدوي —
// نحسبها وقت العرض بس، فما يحتاج أحد يرجع يصفّر حقل discount بنفسه بعد ما تنتهي مدة العرض
export function getActiveDiscount(product: any): number {
  const d = Number(product?.discount) || 0;
  if (d <= 0) return 0;
  if (product?.discountEndsAt) {
    const end = new Date(`${product.discountEndsAt}T23:59:59`);
    if (!isNaN(end.getTime()) && Date.now() > end.getTime()) return 0;
  }
  return Math.min(99, d);
}

export function getDiscountedPrice(product: any): number {
  const discount = getActiveDiscount(product);
  const base = Number(product?.price) || 0;
  return discount > 0 ? Math.max(0, base * (1 - discount / 100)) : base;
}
