// ✅ يقرر أي وسيط (صورة أو فيديو) يظهر أول شي كغلاف — يحترم اختيار الأدمن (coverType) لو المنتج فيه الاثنين،
// وإلا يعرض أي وحد موجود منهم تلقائياً
export function getCoverMedia(product: any): { type: "image" | "video"; src: string } | null {
  const hasImage = !!product?.image;
  const hasVideo = !!product?.video;
  if (hasImage && hasVideo) {
    return product.coverType === "video"
      ? { type: "video", src: product.video }
      : { type: "image", src: product.image };
  }
  if (hasVideo) return { type: "video", src: product.video };
  if (hasImage) return { type: "image", src: product.image };
  return null;
}
