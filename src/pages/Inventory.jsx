import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  MinusIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { INVENTORY as SEED } from "../data/mock.js";
import StatCard from "../components/ui/StatCard.jsx";
import Chip from "../components/ui/Chip.jsx";
import { useAppDialog } from "../context/AppDialogContext.jsx";
import { fmtMoney, fmtNumberAr } from "../data/strings.js";

const STORE_KEY = "mediflow:inventory:v1";

// Seed gets enriched with cost/supplier/lastUpdated for richer experience.
const SEED_ENRICHED = SEED.map((it) => ({
  ...it,
  cost: it.cost ?? Math.max(500, Math.round(Math.random() * 18000)),
  supplier: it.supplier ?? "—",
  lastUpdated: it.lastUpdated ?? new Date().toISOString(),
}));

function calcStatus(stock, threshold) {
  if (stock <= 0) return "critical";
  if (stock <= threshold * 0.4) return "critical";
  if (stock <= threshold) return "low";
  return "ok";
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return SEED_ENRICHED.map((it) => ({ ...it, status: calcStatus(it.stock, it.threshold) }));
}

const STATUS_LABEL = { ok: "متوفر", low: "منخفض", critical: "حرج" };
const STATUS_TONE = { ok: "success", low: "warn", critical: "danger" };

const FILTERS = [
  { id: "all",      label: "الكل" },
  { id: "ok",       label: "متوفر" },
  { id: "low",      label: "منخفض" },
  { id: "critical", label: "حرج" },
];

export default function Inventory() {
  const { confirm } = useAppDialog();
  const [items, setItems] = useState(loadInitial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState(null); // { item } or null
  const [creating, setCreating] = useState(false);

  // Persist on every change
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); }
    catch { /* ignore */ }
  }, [items]);

  const categories = useMemo(
    () => ["all", ...new Set(items.map((it) => it.category))],
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== "all" && it.status !== filter) return false;
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q) ||
        (it.supplier || "").toLowerCase().includes(q)
      );
    });
  }, [items, query, filter, categoryFilter]);

  const stats = useMemo(() => {
    const ok = items.filter((i) => i.status === "ok").length;
    const low = items.filter((i) => i.status === "low").length;
    const crit = items.filter((i) => i.status === "critical").length;
    const totalValue = items.reduce(
      (s, i) => s + Number(i.stock || 0) * Number(i.cost || 0),
      0
    );
    return { ok, low, crit, totalValue };
  }, [items]);

  const lowAlerts = useMemo(
    () => items.filter((i) => i.status !== "ok").sort((a, b) => a.stock - b.stock).slice(0, 6),
    [items]
  );

  const adjust = (id, delta) => {
    setItems((arr) =>
      arr.map((it) => {
        if (it.id !== id) return it;
        const stock = Math.max(0, Number(it.stock || 0) + delta);
        return {
          ...it,
          stock,
          status: calcStatus(stock, it.threshold),
          lastUpdated: new Date().toISOString(),
        };
      })
    );
  };

  const upsertItem = (data) => {
    if (editing) {
      setItems((arr) =>
        arr.map((it) =>
          it.id === editing.id
            ? {
                ...it,
                ...data,
                stock: Number(data.stock),
                threshold: Number(data.threshold),
                cost: Number(data.cost || 0),
                status: calcStatus(Number(data.stock), Number(data.threshold)),
                lastUpdated: new Date().toISOString(),
              }
            : it
        )
      );
    } else {
      const id = `ITM-${String(Date.now()).slice(-6)}`;
      setItems((arr) => [
        {
          id,
          name: data.name,
          category: data.category || "عام",
          stock: Number(data.stock || 0),
          threshold: Number(data.threshold || 0),
          cost: Number(data.cost || 0),
          supplier: data.supplier || "—",
          status: calcStatus(Number(data.stock || 0), Number(data.threshold || 0)),
          lastUpdated: new Date().toISOString(),
        },
        ...arr,
      ]);
    }
    setEditing(null);
    setCreating(false);
  };

  const removeItem = async (id) => {
    const ok = await confirm({
      title: "حذف العنصر",
      message: "هل تريد فعلاً حذف هذا العنصر من المخزون؟",
      confirmText: "حذف",
      cancelText: "إلغاء",
      tone: "danger",
    });
    if (!ok) return;
    setItems((arr) => arr.filter((it) => it.id !== id));
  };

  const resetSeed = async () => {
    const ok = await confirm({
      title: "إعادة التهيئة",
      message: "ستُستبدل قائمة المخزون الحالية ببيانات الافتراضية. متابعة؟",
      confirmText: "نعم",
      cancelText: "إلغاء",
    });
    if (!ok) return;
    setItems(SEED_ENRICHED.map((it) => ({ ...it, status: calcStatus(it.stock, it.threshold) })));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="label-caps text-primary">المستلزمات والصيدلية</div>
          <h1 className="h1 mt-1">المخزون</h1>
          <p className="text-ink-variant mt-1 max-w-xl">
            تتبع مستويات المخزون الحقيقية، ضبط الكميات، وتنبيهات الحدود الدنيا.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={resetSeed}
            className="btn-ghost h-9 px-3 text-xs rounded-xl border border-surface-high"
          >
            إعادة تعبئة
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> إضافة عنصر
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="متوفر"
          value={fmtNumberAr(stats.ok)}
          hint="مستويات صحية"
          icon={CheckBadgeIcon}
          tone="success"
        />
        <StatCard
          label="منخفض"
          value={fmtNumberAr(stats.low)}
          hint="تحت الحد الأدنى"
          icon={ArchiveBoxIcon}
          tone="warn"
        />
        <StatCard
          label="حرج"
          value={fmtNumberAr(stats.crit)}
          hint="يجب الطلب فوراً"
          icon={ExclamationTriangleIcon}
          tone="danger"
        />
        <StatCard
          label="قيمة المخزون"
          value={fmtMoney(stats.totalValue)}
          hint={`${fmtNumberAr(items.length)} عنصر`}
          icon={CurrencyDollarIcon}
          tone="primary"
        />
      </div>

      {/* Low/critical alerts strip */}
      {lowAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-pad bg-warn-soft/30 border border-warn/15"
        >
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <h3 className="h3 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-warn" />
              تنبيهات المخزون
            </h3>
            <span className="text-[11px] text-ink-mute">
              {fmtNumberAr(lowAlerts.length)} عنصر يحتاج إعادة طلب
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowAlerts.map((it) => (
              <button
                key={it.id}
                onClick={() => setEditing(it)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-base border border-surface-high text-xs hover:border-primary/35 transition-colors"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    it.status === "critical" ? "bg-danger" : "bg-warn"
                  }`}
                />
                <span className="font-bold text-ink">{it.name}</span>
                <span className="text-ink-mute tabular-nums">
                  {fmtNumberAr(it.stock)} / {fmtNumberAr(it.threshold)}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="card-pad space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم، الفئة، أو المورّد…"
              className="input h-10 pe-10 ps-3"
            />
          </div>
          <div className="flex items-center gap-1 bg-surface-low rounded-xl p-0.5 border border-surface-high">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all ${
                  filter === f.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-ink-variant hover:text-ink-default"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {categories.length > 2 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-ink-mute font-bold uppercase tracking-wider me-1">الفئة:</span>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  categoryFilter === c
                    ? "bg-primary-soft text-primary ring-1 ring-primary/25"
                    : "text-ink-variant hover:bg-surface-low"
                }`}
              >
                {c === "all" ? "الكل" : c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full lux-table">
            <thead>
              <tr>
                <Th>العنصر</Th>
                <Th>الفئة</Th>
                <Th className="text-end">الكمية</Th>
                <Th className="text-end">الحد</Th>
                <Th>المستوى</Th>
                <Th>الحالة</Th>
                <Th className="text-end">سعر الوحدة</Th>
                <Th className="text-end">إجراء</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="text-sm font-bold text-ink-default">لا توجد نتائج</div>
                    <div className="text-xs text-ink-mute mt-1">جرّب تعديل الفلاتر أو البحث.</div>
                  </td>
                </tr>
              )}
              <AnimatePresence initial={false}>
                {filtered.map((it, i) => {
                  const pct = Math.min(100, Math.round((it.stock / Math.max(it.threshold * 4, 1)) * 100));
                  const tone = it.status;
                  const barColor =
                    tone === "ok" ? "bg-success" : tone === "low" ? "bg-warn" : "bg-danger";
                  return (
                    <motion.tr
                      key={it.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className={`border-t border-surface-low transition ${
                        it.status === "critical"
                          ? "bg-danger-soft/20"
                          : "hover:bg-surface-low/60"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="text-sm font-semibold text-ink truncate">{it.name}</div>
                        <div className="text-[10px] text-ink-mute font-mono mt-0.5">{it.id}</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-variant">{it.category}</td>
                      <td className="px-5 py-3 text-end">
                        <div className="inline-flex items-center gap-1 rounded-xl border border-surface-high bg-surface-base px-1 py-0.5">
                          <button
                            onClick={() => adjust(it.id, -1)}
                            className="w-6 h-6 grid place-items-center text-ink-mute hover:text-danger hover:bg-danger-soft/30 rounded-lg transition-colors"
                            aria-label="نقص"
                          >
                            <MinusIcon className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold tabular-nums text-ink min-w-[2ch] text-center">
                            {fmtNumberAr(it.stock)}
                          </span>
                          <button
                            onClick={() => adjust(it.id, +1)}
                            className="w-6 h-6 grid place-items-center text-ink-mute hover:text-success hover:bg-success-soft/30 rounded-lg transition-colors"
                            aria-label="زيادة"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-variant text-end tabular-nums">
                        {fmtNumberAr(it.threshold)}
                      </td>
                      <td className="px-5 py-3 w-44">
                        <div className="h-1.5 bg-surface-mid rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: i * 0.02 }}
                            className={`h-full ${barColor} rounded-full`}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Chip tone={STATUS_TONE[tone]}>{STATUS_LABEL[tone]}</Chip>
                      </td>
                      <td className="px-5 py-3 text-end text-sm tabular-nums text-ink-variant">
                        {fmtMoney(it.cost)}
                      </td>
                      <td className="px-5 py-3 text-end">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setEditing(it)}
                            className="w-7 h-7 grid place-items-center text-ink-mute hover:text-primary hover:bg-primary-soft/30 rounded-lg transition-colors"
                            aria-label="تعديل"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeItem(it.id)}
                            className="w-7 h-7 grid place-items-center text-ink-mute hover:text-danger hover:bg-danger-soft/30 rounded-lg transition-colors"
                            aria-label="حذف"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Item dialog */}
      <AnimatePresence>
        {(editing || creating) && (
          <ItemDialog
            initial={editing}
            onClose={() => {
              setEditing(null);
              setCreating(false);
            }}
            onSubmit={upsertItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-5 py-3 label-caps text-start ${className}`}>{children}</th>;
}

/* ── Add / edit dialog ───────────────────────────────────────────────── */

function ItemDialog({ initial, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    category: initial?.category || "",
    stock: initial?.stock ?? 0,
    threshold: initial?.threshold ?? 10,
    cost: initial?.cost ?? 0,
    supplier: initial?.supplier || "",
  });

  const onSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] grid place-items-center bg-ink/30 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        className="bg-surface-base rounded-2xl shadow-pop max-w-lg w-full p-6"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSave}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="h3">{initial ? "تعديل عنصر" : "إضافة عنصر"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 grid place-items-center text-ink-mute hover:text-ink-default rounded-lg hover:bg-surface-low transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label-caps mb-1.5 block">الاسم *</label>
            <input
              autoFocus
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input h-10"
              placeholder="مثلاً: قفازات جراحية مقاس M"
            />
          </div>
          <div>
            <label className="label-caps mb-1.5 block">الفئة</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="input h-10"
              placeholder="مستهلكات / صيدلية / تعقيم…"
            />
          </div>
          <div>
            <label className="label-caps mb-1.5 block">المورّد</label>
            <input
              value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              className="input h-10"
            />
          </div>
          <div>
            <label className="label-caps mb-1.5 block">الكمية</label>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              className="input h-10 tabular-nums"
            />
          </div>
          <div>
            <label className="label-caps mb-1.5 block">الحد الأدنى</label>
            <input
              type="number"
              min={0}
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
              className="input h-10 tabular-nums"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label-caps mb-1.5 block">سعر الوحدة (ل.س)</label>
            <input
              type="number"
              min={0}
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              className="input h-10 tabular-nums"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn-ghost h-10 px-4 text-sm rounded-xl">
            إلغاء
          </button>
          <button type="submit" className="btn-primary h-10 px-5 text-sm rounded-xl">
            حفظ
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
