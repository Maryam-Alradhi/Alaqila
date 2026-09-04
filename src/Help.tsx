import { useNavigate } from "react-router-dom";

type Step = { number: string; title: string; description: string };
type Section = { icon: string; title: string; intro: string; steps?: Step[]; note?: string; action?: { label: string; path: string } };

const sections: Section[] = [
  {
    icon: "🛍️",
    title: "طريقة تقديم الطلب",
    intro: "تمر عملية الشراء في هذا المتجر بأربع خطوات بسيطة:",
    steps: [
      { number: "١", title: "تصفّح المنتجات", description: "يمكن تصفّح المنتجات من صفحة المتجر، واختيار القسم المناسب، أو استخدام خانة البحث للوصول إلى منتج معيّن مباشرةً." },
      { number: "٢", title: "الإضافة إلى السلة", description: "بعد فتح صفحة المنتج المطلوب، تُحدَّد المواصفات إن وُجدت (كالمقاس أو نوع السلسلة)، ثم يُضغط زر «أضف للسلة»." },
      { number: "٣", title: "إتمام الطلب", description: "من صفحة السلة، يُضغط زر «إتمام الطلب»، وتُدخَل بيانات التواصل، ويُختار أسلوب الاستلام (توصيل أو استلام شخصي) وطريقة الدفع." },
      { number: "٤", title: "تأكيد الطلب", description: "بعد إرسال الطلب، يظهر رقم مرجعي خاص به، وتصل رسالة بريد إلكتروني تتضمن تفاصيله وتحديثات حالته لاحقاً." },
    ],
    note: "تجدر الإشارة إلى أن إتمام الطلب يستلزم تسجيل الدخول أولاً، وذلك لضمان إمكانية متابعته لاحقاً.",
  },
  {
    icon: "📦",
    title: "صفحة «تتبع الطلب»",
    intro: "تُعنى هذه الصفحة بعرض الطلبات التي لم تصل إلى العميل بعد، أياً كانت حالتها الراهنة: قيد المراجعة، أو مؤكَّدة، أو في طريقها إلى الوجهة، أو حتى المرفوضة منها. تبقى هذه الطلبات ظاهرة في هذه الصفحة باستمرار طالما أن المستخدم مسجّل الدخول، دون أن تختفي بمجرد تحديث الصفحة.",
    note: "تحتوي هذه الصفحة أيضاً على تبويب مستقل باسم «طلبات الإرجاع»، يُعرض فيه كل طلب استرجاع سبق تقديمه، مع بيان حالته: قيد المراجعة، أو موافَق عليه، أو مرفوض.",
    action: { label: "الانتقال إلى صفحة تتبع الطلب", path: "/track" },
  },
  {
    icon: "🗂️",
    title: "صفحة «طلباتي»",
    intro: "تُخصَّص هذه الصفحة للطلبات التي وصلت بالفعل إلى العميل (سواء عبر التوصيل أو الاستلام الشخصي). ومن خلالها يمكن القيام بأمرين:",
    steps: [
      { number: "١", title: "إعادة الطلب", description: "بالضغط على زر «إعادة الطلب»، تُضاف المنتجات نفسها إلى السلة من جديد بالكمية ذاتها، تمهيداً لتقديم طلب مماثل دون الحاجة إلى البحث عن كل منتج على حدة." },
      { number: "٢", title: "طلب الاسترجاع", description: "في حال وجود خلل في أحد المنتجات المستلمة، يمكن تقديم طلب استرجاع مباشرة من هذه الصفحة، على النحو الموضّح في القسم التالي." },
    ],
    action: { label: "الانتقال إلى صفحة طلباتي", path: "/orders" },
  },
  {
    icon: "🔁",
    title: "طلب الاسترجاع",
    intro: "يتاح تقديم طلب استرجاع لأي طلب وصل إلى العميل فعلاً، خلال خمسة عشر يوماً من تاريخ استلامه.",
    steps: [
      { number: "١", title: "التقديم", description: "من صفحة «طلباتي»، يُفتح الطلب المعنيّ، ثم يُضغط زر «الإبلاغ عن خلل / طلب إرجاع»، ويُذكر سبب الطلب بإيجاز." },
      { number: "٢", title: "المراجعة", description: "يخضع الطلب لمراجعة إدارة المتجر، التي تقرر الموافقة عليه أو رفضه بحسب مدى وجاهة السبب المذكور." },
      { number: "٣", title: "المتابعة", description: "تُعرض حالة الطلب (قيد المراجعة، موافَق عليه، أو مرفوض) في تبويب «طلبات الإرجاع» بصفحة تتبع الطلب. وفي حال الموافقة، يُتواصَل مع العميل مباشرةً لاستكمال الإجراءات." },
    ],
  },
];

export default function Help() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 16px 70px", direction: "rtl" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>❓</div>
          <h1 className="font-display gold-shimmer" style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: "800", margin: "0 0 10px" }}>
            دليل استخدام المتجر
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", maxWidth: "480px", margin: "0 auto" }}>
            شرح مفصّل لأسلوب تقديم الطلبات، ومواضع متابعتها، وكيفية طلب استرجاعها عند الحاجة.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {sections.map(section => (
            <div key={section.title} className="card" style={{ padding: "26px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "26px" }}>{section.icon}</span>
                <h2 style={{ color: "var(--gold)", fontSize: "18px", fontWeight: "800", margin: 0 }}>{section.title}</h2>
              </div>
              <p style={{ color: "var(--text-dim)", fontSize: "14px", lineHeight: "1.9", margin: "0 0 16px" }}>
                {section.intro}
              </p>

              {section.steps && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  {section.steps.map(step => (
                    <div key={step.number} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "50%", background: "var(--gold-dim)", border: "1px solid var(--gold-border)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "800" }}>
                        {step.number}
                      </span>
                      <div>
                        <p style={{ color: "var(--text)", fontSize: "14px", fontWeight: "700", margin: "0 0 3px" }}>{step.title}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.8", margin: 0 }}>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {section.note && (
                <p style={{ color: "var(--amber)", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "13px", lineHeight: "1.8", margin: section.action ? "0 0 14px" : 0 }}>
                  {section.note}
                </p>
              )}

              {section.action && (
                <button onClick={() => navigate(section.action!.path)} className="btn-3d"
                  style={{ padding: "10px 20px", background: "var(--gold-dim)", border: "1px solid var(--gold-border)", borderRadius: "var(--radius-sm)", color: "var(--gold)", cursor: "pointer", fontSize: "13px", fontWeight: "700", fontFamily: "inherit" }}>
                  {section.action.label} ←
                </button>
              )}
            </div>
          ))}

          <div className="card" style={{ padding: "26px", textAlign: "center" }}>
            <p style={{ color: "var(--text-dim)", fontSize: "14px", margin: "0 0 14px" }}>
              في حال وجود استفسار لم تتناوله هذه الصفحة، يسعدنا تلقّي تواصل مباشر عبر واتساب.
            </p>
            <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="btn-gold btn-3d"
              style={{ display: "inline-block", padding: "11px 26px", textDecoration: "none" }}>
              التواصل عبر واتساب
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
