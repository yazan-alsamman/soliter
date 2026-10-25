import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronDownIcon,
  XMarkIcon,
  TagIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { ROLES, useAuth } from "../context/AuthContext.jsx";
import { useUsers } from "../context/UsersContext.jsx";
import { useProcedures } from "../context/ProceduresContext.jsx";
import { fmtMoney, fmtNumberAr } from "../data/strings.js";

// Known English slugs → Arabic display labels (for backward compat with existing seed data)
const KNOWN_CATEGORIES_AR = {
  dental: "أسنان",
  laser: "ليزر",
  skin: "عناية البشرة",
  aesthetic: "تجميل",
  general: "عام",
};

function getCategoryLabel(cat) {
  return KNOWN_CATEGORIES_AR[cat] || cat;
}

function getCategoryValue(displayLabel) {
  const entry = Object.entries(KNOWN_CATEGORIES_AR).find(([, v]) => v === displayLabel);
  return entry ? entry[0] : displayLabel;
}

function ServiceRow({ svc, canManage, onEdit, onDelete, onToggleActive }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 px-4 py-3 border-t border-surface-low first:border-t-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${svc.active ? "text-ink" : "text-ink-mute line-through"}`}>
            {svc.name}
          </span>
          {!svc.active && (
            <span className="chip bg-surface-mid text-ink-mute text-[10px]">معطّل</span>
          )}
        </div>
        {svc.aliases?.length > 0 && (
          <div className="text-[11px] text-ink-mute mt-0.5">{svc.aliases.join(" · ")}</div>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm text-ink-variant shrink-0">
        <div className="flex items-center gap-1">
          <ClockIcon className="w-3.5 h-3.5 text-ink-line" />
          <span>{Math.round((svc.duration || 1) * 60)} دق</span>
        </div>
        <div className="font-bold text-ink font-display">
          {fmtMoney(svc.price)}
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleActive(svc)}
            className={`text-xs h-7 px-2.5 rounded-lg font-semibold transition-colors ${
              svc.active
                ? "text-ink-mute hover:bg-surface-mid hover:text-ink"
                : "text-success hover:bg-success-soft"
            }`}
          >
            {svc.active ? "تعطيل" : "تفعيل"}
          </button>
          <button
            onClick={() => onEdit(svc)}
            className="w-7 h-7 rounded-lg hover:bg-surface-mid grid place-items-center text-ink-mute hover:text-primary transition-colors"
          >
            <PencilSquareIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(svc)}
            className="w-7 h-7 rounded-lg hover:bg-danger-soft grid place-items-center text-ink-mute hover:text-danger transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function AddServiceInlineForm({ category, doctorId, onSave, onCancel }) {
  const [form, setForm] = useState({ name: "", price: "", duration: "30", aliases: "" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return setError("اسم الخدمة مطلوب");
    if (!form.price || Number(form.price) <= 0) return setError("السعر مطلوب");
    setIsSaving(true);
    const result = await onSave({
      name: form.name.trim(),
      price: Number(form.price),
      duration: (Number(form.duration) || 30) / 60,
      category: getCategoryValue(category),
      aliases: form.aliases,
      active: true,
    });
    if (!result.ok) { setError(result.message); setIsSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-primary/20 bg-primary-soft/10 px-4 py-3"
    >
      <div className="text-xs font-bold text-primary mb-2">خدمة جديدة في فئة «{category}»</div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          autoFocus
          className="input sm:col-span-2"
          placeholder="اسم الخدمة (مثال: ليزر الوجه)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          type="number"
          className="input"
          placeholder="السعر (ل.س)"
          min={0}
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          type="number"
          className="input"
          placeholder="المدة (دقيقة)"
          min={5}
          value={form.duration}
          onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          className="input sm:col-span-3"
          placeholder="أسماء بديلة (اختياري) — مفصولة بفواصل"
          value={form.aliases}
          onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))}
        />
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={submit} disabled={isSaving}>
            {isSaving ? "جارٍ الحفظ…" : "إضافة"}
          </button>
          <button className="btn-ghost px-3" onClick={onCancel}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      {error && <div className="text-xs text-danger mt-2">{error}</div>}
    </motion.div>
  );
}

function CategoryCard({ category, services, expanded, onToggle, canManage, onEdit, onDelete, onToggleActive, onAddService, addingHere, onSaveService, onCancelAdd }) {
  const activeCount = services.filter((s) => s.active).length;

  return (
    <div className="card overflow-hidden">
      {/* Category header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-low/40 transition-colors text-start"
        onClick={onToggle}
      >
        <div className="w-8 h-8 rounded-xl bg-primary-soft grid place-items-center shrink-0">
          <TagIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-ink">{category}</div>
          <div className="text-xs text-ink-mute mt-0.5">
            {fmtNumberAr(activeCount)} خدمة مفعّلة
            {services.length > activeCount && ` · ${fmtNumberAr(services.length - activeCount)} معطّلة`}
          </div>
        </div>
        {canManage && (
          <button
            className="btn-ghost h-8 px-3 text-xs gap-1.5 shrink-0"
            onClick={(e) => { e.stopPropagation(); onAddService(); }}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            إضافة خدمة
          </button>
        )}
        <ChevronDownIcon
          className={`w-5 h-5 text-ink-mute transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Services list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-high">
              <AnimatePresence>
                {services.map((svc) => (
                  <ServiceRow
                    key={svc.id}
                    svc={svc}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleActive={onToggleActive}
                  />
                ))}
              </AnimatePresence>

              {services.length === 0 && !addingHere && (
                <div className="px-5 py-6 text-center text-sm text-ink-mute">
                  لا توجد خدمات في هذه الفئة بعد.
                </div>
              )}

              <AnimatePresence>
                {addingHere && (
                  <AddServiceInlineForm
                    key="add-form"
                    category={category}
                    onSave={onSaveService}
                    onCancel={onCancelAdd}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddCategoryModal({ existingCategories, onClose, onSave }) {
  const [catName, setCatName] = useState("");
  const [form, setForm] = useState({ name: "", price: "", duration: "30" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    const trimmed = catName.trim();
    if (!trimmed) return setError("اسم الفئة مطلوب");
    if (!form.name.trim()) return setError("أضف خدمة واحدة على الأقل لهذه الفئة");
    if (!form.price || Number(form.price) <= 0) return setError("سعر الخدمة مطلوب");
    setIsSaving(true);
    const result = await onSave(trimmed, {
      name: form.name.trim(),
      price: Number(form.price),
      duration: (Number(form.duration) || 30) / 60,
      active: true,
    });
    if (!result.ok) { setError(result.message); setIsSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="card-modal w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="h3">إضافة فئة جديدة</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-mid grid place-items-center text-ink-mute"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-caps mb-1.5 block">اسم الفئة</label>
            <input
              autoFocus
              className="input"
              placeholder="مثال: ليزر، أسنان، عناية بشرة..."
              value={catName}
              list="existing-categories"
              onChange={(e) => setCatName(e.target.value)}
            />
            <datalist id="existing-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="rounded-xl border border-surface-high p-4 space-y-3">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-wide">
              الخدمة الأولى في هذه الفئة
            </div>
            <input
              className="input"
              placeholder="اسم الخدمة (مثال: ليزر الوجه)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-caps mb-1 block">السعر (ل.س)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="320000"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="label-caps mb-1 block">المدة (دقيقة)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="30"
                  min={5}
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {error && <div className="text-xs text-danger">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary gap-1.5" onClick={submit} disabled={isSaving}>
            <PlusIcon className="w-4 h-4" />
            {isSaving ? "جارٍ الإنشاء…" : "إنشاء الفئة"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EditServiceModal({ svc, onClose, onSave }) {
  const [form, setForm] = useState({
    name: svc.name,
    price: String(svc.price),
    duration: String(Math.round((svc.duration || 1) * 60)),
    category: getCategoryLabel(svc.category),
    aliases: (svc.aliases || []).join(", "),
    active: svc.active,
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return setError("اسم الخدمة مطلوب");
    if (!form.price || Number(form.price) <= 0) return setError("السعر مطلوب");
    setIsSaving(true);
    const result = await onSave({
      name: form.name.trim(),
      price: Number(form.price),
      duration: (Number(form.duration) || 30) / 60,
      category: getCategoryValue(form.category) || form.category,
      aliases: form.aliases
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      active: form.active,
    });
    if (!result.ok) { setError(result.message); setIsSaving(false); }
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="card-modal w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="h3">تعديل الخدمة</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-mid grid place-items-center text-ink-mute"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label-caps mb-1 block">اسم الخدمة</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label-caps mb-1 block">الفئة</label>
            <input className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-caps mb-1 block">السعر (ل.س)</label>
              <input type="number" className="input" value={form.price} min={0} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <label className="label-caps mb-1 block">المدة (دقيقة)</label>
              <input type="number" className="input" value={form.duration} min={5} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label-caps mb-1 block">أسماء بديلة</label>
            <input className="input" placeholder="مفصولة بفواصل" value={form.aliases} onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-variant cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            خدمة مفعّلة
          </label>
          {error && <div className="text-xs text-danger">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={submit} disabled={isSaving}>
            {isSaving ? "جارٍ الحفظ…" : "حفظ التعديل"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteDialog({ svc, onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="card-modal w-full max-w-md p-6"
      >
        <h3 className="h3">حذف الخدمة؟</h3>
        <p className="text-sm text-ink-variant mt-2">
          سيتم حذف خدمة «{svc.name}» نهائيًا. لا يمكن التراجع.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-danger" onClick={onConfirm}>تأكيد الحذف</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function DoctorProcedures() {
  const { user, role } = useAuth();
  const { users } = useUsers();
  const { getProceduresByDoctor, createProcedure, updateProcedure, deleteProcedure } = useProcedures();

  const doctors = useMemo(() => (users || []).filter((u) => u.role === ROLES.DOCTOR), [users]);
  const isDoctor = role === ROLES.DOCTOR;
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const doctorId = isDoctor ? user.id : selectedDoctor;
  const canManage = role === ROLES.DOCTOR || role === ROLES.ADMIN;
  const doctor = doctors.find((d) => d.id === doctorId);

  useEffect(() => {
    if (isDoctor || doctors.length === 0) return;
    setSelectedDoctor((prev) => {
      if (prev && doctors.some((d) => d.id === prev)) return prev;
      return doctors[0]?.id || "";
    });
  }, [isDoctor, doctors]);

  const rows = useMemo(() => getProceduresByDoctor(doctorId, true), [doctorId, getProceduresByDoctor]);

  // Group services by category display label
  const groupedMap = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const label = getCategoryLabel(row.category || "عام");
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(row);
    });
    return map;
  }, [rows]);

  const [expandedCats, setExpandedCats] = useState({});
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addingToCat, setAddingToCat] = useState(null); // category label
  const [editingService, setEditingService] = useState(null);
  const [deletingService, setDeletingService] = useState(null);

  // Auto-expand new categories
  useEffect(() => {
    setExpandedCats((prev) => {
      const next = { ...prev };
      groupedMap.forEach((_, cat) => {
        if (!(cat in next)) next[cat] = true;
      });
      return next;
    });
  }, [groupedMap]);

  const toggleCat = (cat) =>
    setExpandedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const handleSaveNewService = async (servicePayload) => {
    if (!doctorId) return { ok: false, message: "اختر طبيبًا أولًا" };
    const result = await createProcedure(doctorId, servicePayload);
    if (result.ok) setAddingToCat(null);
    return result;
  };

  const handleSaveCategory = async (categoryName, firstService) => {
    if (!doctorId) return { ok: false, message: "اختر طبيبًا أولًا" };
    const result = await createProcedure(doctorId, {
      ...firstService,
      category: getCategoryValue(categoryName) || categoryName,
    });
    if (result.ok) {
      const label = getCategoryLabel(getCategoryValue(categoryName) || categoryName);
      setExpandedCats((prev) => ({ ...prev, [label]: true }));
      setAddCategoryOpen(false);
    }
    return result;
  };

  const totalServices = rows.filter((r) => r.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="label-caps text-primary">العيادة</div>
          <h1 className="h1 mt-1">خدمات وأسعار الطبيب</h1>
          <p className="text-ink-variant mt-1 max-w-xl">
            {canManage
              ? "نظّم الخدمات في فئات (ليزر، أسنان…) مع اسم وسعر كل خدمة."
              : "عرض خدمات الطبيب المسجّلة في العيادة."}
          </p>
        </div>
        {!isDoctor && doctors.length > 0 && (
          <select
            className="input h-10 w-[260px]"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}{doc.title ? ` — ${doc.title}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="card-pad py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 text-sm text-ink-variant">
            <span>
              <span className="font-bold text-ink">{fmtNumberAr(groupedMap.size)}</span> فئة
            </span>
            <span className="text-ink-line">·</span>
            <span>
              <span className="font-bold text-ink">{fmtNumberAr(totalServices)}</span> خدمة مفعّلة
            </span>
            {doctor && (
              <>
                <span className="text-ink-line">·</span>
                <span className="font-semibold text-primary">{doctor.name}</span>
              </>
            )}
          </div>
          {canManage && (
            <button
              onClick={() => setAddCategoryOpen(true)}
              className="btn-primary h-9 px-4 gap-1.5 text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              فئة جديدة
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="card py-16 text-center">
          <CurrencyDollarIcon className="w-12 h-12 text-ink-line mx-auto mb-3" />
          <div className="font-semibold text-ink mb-1">لا توجد خدمات مُسجَّلة</div>
          <div className="text-sm text-ink-mute mb-5">
            {!doctorId
              ? "اختر طبيبًا من القائمة أعلاه"
              : "أضف فئة أولى مثل «ليزر» أو «أسنان» ثم أضف الخدمات تحتها"}
          </div>
          {canManage && doctorId && (
            <button
              onClick={() => setAddCategoryOpen(true)}
              className="btn-primary gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              إضافة أول فئة
            </button>
          )}
        </div>
      )}

      {/* Category cards */}
      {rows.length > 0 && (
        <div className="space-y-4">
          <AnimatePresence>
            {[...groupedMap.entries()].map(([catLabel, services]) => (
              <motion.div
                key={catLabel}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <CategoryCard
                  category={catLabel}
                  services={services}
                  expanded={expandedCats[catLabel] ?? true}
                  onToggle={() => toggleCat(catLabel)}
                  canManage={canManage}
                  onEdit={(svc) => setEditingService(svc)}
                  onDelete={(svc) => setDeletingService(svc)}
                  onToggleActive={(svc) => updateProcedure(svc.id, { active: !svc.active })}
                  onAddService={() => {
                    setAddingToCat(catLabel);
                    setExpandedCats((prev) => ({ ...prev, [catLabel]: true }));
                  }}
                  addingHere={addingToCat === catLabel}
                  onSaveService={handleSaveNewService}
                  onCancelAdd={() => setAddingToCat(null)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add category button at bottom when services exist */}
          {canManage && (
            <button
              onClick={() => setAddCategoryOpen(true)}
              className="w-full rounded-2xl border-2 border-dashed border-surface-high py-4 text-sm text-ink-mute hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              إضافة فئة جديدة
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {addCategoryOpen && (
        <AddCategoryModal
          existingCategories={[...groupedMap.keys()]}
          onClose={() => setAddCategoryOpen(false)}
          onSave={handleSaveCategory}
        />
      )}

      {editingService && (
        <EditServiceModal
          svc={editingService}
          onClose={() => setEditingService(null)}
          onSave={(patch) => updateProcedure(editingService.id, patch)}
        />
      )}

      {deletingService && (
        <DeleteDialog
          svc={deletingService}
          onClose={() => setDeletingService(null)}
          onConfirm={() => {
            deleteProcedure(deletingService.id);
            setDeletingService(null);
          }}
        />
      )}
    </div>
  );
}
