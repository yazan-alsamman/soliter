import { BellIcon } from "@heroicons/react/24/outline";

const items = [
  { id: "n1", title: "تم استلام طلب موعدك", body: "فريق الاستقبال يراجع الفجوات المتاحة.", at: "منذ ساعتين", read: false },
  { id: "n2", title: "تذكير غداً", body: "موعد متابعة ليزر — يرجى الحضور قبل 10 دقائق.", at: "أمس", read: true },
  { id: "n3", title: "عرض محدود", body: "خصم على باقة هيدرافيشال حتى نهاية الأسبوع.", at: "منذ 3 أيام", read: true },
];

export default function PortalNotifications() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BellIcon className="w-8 h-8 text-[#0e7490]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الإشعارات</h1>
          <p className="text-sm text-slate-600">قريباً: ربط قنوات SMS وواتساب وبريد مع تفضيلات الاشتراك.</p>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-2xl border px-4 py-4 ${n.read ? "border-slate-100 bg-white" : "border-cyan-100 bg-cyan-50/50"}`}
          >
            <div className="flex justify-between gap-2">
              <span className="font-bold text-slate-900">{n.title}</span>
              <span className="text-xs text-slate-500 shrink-0">{n.at}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
