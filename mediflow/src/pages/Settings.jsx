import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  ChevronDownIcon,
  UsersIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useAuth, ROLES } from "../context/AuthContext.jsx";
import { useUsers } from "../context/UsersContext.jsx";
import { api } from "../services/apiClient.js";
import DoctorWeeklySchedulePanel from "../components/settings/DoctorWeeklySchedulePanel.jsx";

function navSections(role) {
  const base = [
    { id: "account", label: "حسابي", icon: UserCircleIcon, roles: ["admin", "doctor", "receptionist"] },
    { id: "hours", label: "دوام العمل", icon: CalendarDaysIcon, roles: ["admin", "doctor"] },
    { id: "clinic", label: "إعدادات العيادة", icon: Cog6ToothIcon, roles: ["admin"] },
    { id: "permissions", label: "صلاحيات المستخدمين", icon: ShieldCheckIcon, roles: ["admin"] },
    { id: "accounts", label: "إدارة الحسابات", icon: UsersIcon, roles: ["admin"] },
  ];
  return base.filter((s) => s.roles.includes(role));
}

export default function Settings() {
  const { role, can, refreshProfile, user: authUser } = useAuth();
  const { users, createUser, updateUser, toggleUserActive } = useUsers();
  const sections = useMemo(() => navSections(role), [role]);
  const [active, setActive] = useState(sections[0]?.id || "account");

  useEffect(() => {
    if (!sections.some((s) => s.id === active)) setActive(sections[0]?.id || "account");
  }, [sections, active]);

  const current = sections.find((s) => s.id === active);
  const doctorUsers = useMemo(
    () => users.filter((u) => String(u.role || "").toLowerCase() === "doctor" && u.active !== false),
    [users]
  );
  const defaultDoctorId = doctorUsers[0]?.doctorCode || doctorUsers[0]?.id || "";
  const defaultScheduleDoctorId = doctorUsers[0]?.id || "";
  const [scheduleDoctorId, setScheduleDoctorId] = useState("");
  useEffect(() => {
    setScheduleDoctorId((prev) => {
      if (prev && doctorUsers.some((d) => d.id === prev)) return prev;
      return defaultScheduleDoctorId;
    });
  }, [defaultScheduleDoctorId, doctorUsers]);
  const [form, setForm] = useState({
    name: "",
    title: "",
    role: "doctor",
    username: "",
    email: "",
    tempPassword: "",
    doctorId: "",
  });

  useEffect(() => {
    setForm((f) => ({ ...f, doctorId: f.doctorId || defaultDoctorId }));
  }, [defaultDoctorId]);
  const [formError, setFormError] = useState("");
  const accounts = useMemo(
    () => users.filter((u) => u.role === "doctor" || u.role === "receptionist"),
    [users]
  );

  const submitAccount = async (event) => {
    event.preventDefault();
    const result = await createUser(form);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setFormError("");
    setForm({
      name: "",
      title: "",
      role: "doctor",
      username: "",
      email: "",
      tempPassword: "",
      doctorId: defaultDoctorId,
    });
  };

  const roleTitle =
    role === ROLES.ADMIN ? "مدير النظام" : role === ROLES.DOCTOR ? "طبيب" : "موظف استقبال";

  return (
    <div className="space-y-6">
      <div>
        <div className="label-caps text-primary">النظام</div>
        <h1 className="h1 mt-1">الإعدادات</h1>
        <p className="text-ink-variant mt-1">
          {role === ROLES.ADMIN
            ? "إدارة العيادة والصلاحيات والحسابات."
            : "إعدادات حسابك وتغيير كلمة المرور بأمان."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="card p-2 h-fit">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-start transition ${
                  isActive ? "bg-primary-soft/60 text-primary" : "text-ink-variant hover:bg-surface-low"
                }`}
              >
                <Icon className="w-5 h-5" />
                {s.label}
              </button>
            );
          })}
        </aside>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-pad"
        >
          <h2 className="h3 mb-1">{current?.label}</h2>
          <p className="text-sm text-ink-mute mb-6">
            {active === "account" && `أنت مسجّل كـ ${roleTitle}.`}
            {active === "clinic" && "إعدادات عامة للعيادة (عرض توضيحي حتى ربط النظام بالخلفية)."}
            {active === "permissions" && "تفعيل أو تعطيل التصرّف والرؤية لكل مستخدم."}
            {active === "accounts" && "إنشاء حسابات الأطباء والاستقبال."}
            {active === "hours" && "حدد أيام ومواعيد الدوام لحساب الفترات المتاحة عند الحجز."}
          </p>

          {active === "hours" && (role === ROLES.ADMIN || role === ROLES.DOCTOR) && (
            <div className="space-y-5 -mt-2">
              {role === ROLES.ADMIN && (
                <div>
                  <label className="label-caps">الطبيب</label>
                  <select
                    className="input mt-1.5 max-w-md"
                    value={scheduleDoctorId}
                    onChange={(e) => setScheduleDoctorId(e.target.value)}
                  >
                    {doctorUsers.length === 0 ? (
                      <option value="">لا يوجد أطباء</option>
                    ) : (
                      doctorUsers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
              <DoctorWeeklySchedulePanel
                doctorId={role === ROLES.ADMIN ? scheduleDoctorId : authUser?.id}
                title={role === ROLES.DOCTOR ? "دوامي الأسبوعي" : "جدول دوام الطبيب"}
              />
            </div>
          )}

          {active === "account" && (
            <div className="space-y-4">
              <GeneralAccountCard refreshProfile={refreshProfile} />
              <div className="rounded-xl border border-surface-high bg-surface-low/25 px-4 py-3 text-sm text-ink-variant">
                اسم العيادة ورقم الترخيص يعرضان هنا عند توفرها من الإدارة المركزية.
              </div>
            </div>
          )}

          {active === "clinic" && role === ROLES.ADMIN && (
            <div className="space-y-5">
              <Field label="اسم العيادة (عرض)" value="عيادة ميدي فلو الذكية" />
              <Field label="البريد الإلكتروني الرئيسي (عرض)" value="admin@mediflow.health" />
              <Field label="الهاتف (عرض)" value="+963 ..." />
              <p className="text-xs text-ink-mute">
                سيتم ربط هذه الحقول لاحقًا بإعدادات المستأجر في الخادم دون تعقيد على الواجهة.
              </p>
            </div>
          )}

          {active === "permissions" && can("users.manage") && (
            <AdminPermissionsPanel users={users} updateUser={updateUser} />
          )}

          {active === "permissions" && !can("users.manage") && (
            <div className="rounded-xl border border-surface-high bg-surface-low/40 px-4 py-6 text-sm text-ink-mute">
              هذا القسم متاح لمدير النظام فقط.
            </div>
          )}

          {active === "accounts" && can("users.manage") && (
            <div className="space-y-6">
              <form onSubmit={submitAccount} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="input"
                  placeholder="الاسم الكامل"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="المسمى الوظيفي"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="doctor">طبيب</option>
                  <option value="receptionist">استقبال</option>
                </select>
                {form.role === "doctor" ? (
                  <select
                    className="input"
                    value={form.doctorId || defaultDoctorId}
                    onChange={(e) => setForm((prev) => ({ ...prev, doctorId: e.target.value }))}
                  >
                    {doctorUsers.map((doctor) => (
                      <option key={doctor.id} value={doctor.doctorCode || doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="input opacity-70" value="لا ينطبق على موظف الاستقبال" readOnly />
                )}
                <input
                  className="input"
                  placeholder="اسم المستخدم"
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  className="input md:col-span-2"
                  placeholder="كلمة المرور المؤقتة"
                  value={form.tempPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, tempPassword: e.target.value }))}
                />
                <div className="md:col-span-2 flex items-center justify-between">
                  <span className="text-sm text-ink-mute">
                    التحقق المحلي يشمل تفرد اسم المستخدم والبريد الإلكتروني.
                  </span>
                  <button type="submit" className="btn-primary">
                    إنشاء الحساب
                  </button>
                </div>
                {formError ? <div className="md:col-span-2 text-sm text-red-500">{formError}</div> : null}
              </form>

              <div className="card p-0 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-low/60 text-ink-mute">
                    <tr>
                      <th className="px-3 py-2 text-start">الاسم</th>
                      <th className="px-3 py-2 text-start">الدور</th>
                      <th className="px-3 py-2 text-start">البريد</th>
                      <th className="px-3 py-2 text-start">الحالة</th>
                      <th className="px-3 py-2 text-start">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-t border-surface-low">
                        <td className="px-3 py-2">
                          <input
                            className="input h-9"
                            value={account.name}
                            onChange={(e) => void updateUser(account.id, { name: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="input h-9"
                            value={account.role}
                            onChange={(e) =>
                              void updateUser(account.id, {
                                role: e.target.value,
                                doctorId:
                                  e.target.value === "doctor"
                                    ? account.doctorId || defaultDoctorId
                                    : null,
                              })
                            }
                          >
                            <option value="doctor">طبيب</option>
                            <option value="receptionist">استقبال</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="input h-9"
                            value={account.email}
                            onChange={(e) => void updateUser(account.id, { email: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">{account.active ? "مفعل" : "معطل"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              className="input h-9 w-[160px]"
                              value={account.title}
                              onChange={(e) => void updateUser(account.id, { title: e.target.value })}
                              placeholder="المسمى"
                            />
                            <button
                              type="button"
                              className="btn-ghost !h-8 !px-3"
                              onClick={() => void toggleUserActive(account.id)}
                            >
                              {account.active ? "تعطيل" : "تفعيل"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === "accounts" && !can("users.manage") && (
            <div className="rounded-xl border border-surface-high bg-surface-low/40 px-4 py-6 text-sm text-ink-mute">
              هذا القسم متاح لمدير النظام فقط.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function AdminPermissionsPanel({ users, updateUser }) {
  const targets = useMemo(
    () => users.filter((u) => u.role === "doctor" || u.role === "receptionist"),
    [users]
  );
  const [openId, setOpenId] = useState(null);
  const [draftById, setDraftById] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState("");

  const openRow = useCallback((u) => {
    setOpenId(u.id);
    setDraftById((d) => ({
      ...d,
      [u.id]: structuredClone(u.access || {}),
    }));
    setMsg("");
  }, []);

  const setDraft = useCallback((userId, next) => {
    setDraftById((d) => ({ ...d, [userId]: next }));
  }, []);

  const save = async (userId) => {
    const draft = draftById[userId];
    if (!draft) return;
    setSavingId(userId);
    setMsg("");
    const res = await updateUser(userId, { access: draft });
    setSavingId(null);
    if (!res.ok) {
      setMsg(res.message || "تعذر الحفظ");
      return;
    }
    setMsg("تم حفظ الصلاحيات.");
  };

  const resetRow = (u) => {
    setDraftById((d) => ({
      ...d,
      [u.id]: structuredClone(u.access || {}),
    }));
    setMsg("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-mute">
        التغييرات تُحفظ في الخادم وتُطبَّق فور إعادة تحميل الجلسة أو تسجيل الدخول من المستخدم المعني.
      </p>
      {msg && <div className="text-xs font-semibold text-secondary">{msg}</div>}
      <div className="space-y-2">
        {targets.map((u) => {
          const open = openId === u.id;
          const draft = draftById[u.id];
          return (
            <div key={u.id} className="rounded-xl border border-surface-high bg-surface-base overflow-hidden">
              <button
                type="button"
                onClick={() => (open ? setOpenId(null) : openRow(u))}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start hover:bg-surface-low/40"
              >
                <div>
                  <div className="font-semibold text-ink">{u.name}</div>
                  <div className="text-xs text-ink-mute">
                    {u.role === "doctor" ? "طبيب" : "استقبال"} · {u.email}
                  </div>
                </div>
                <ChevronDownIcon className={`w-5 h-5 shrink-0 transition ${open ? "rotate-180" : ""}`} />
              </button>
              {open && draft && (
                <div className="border-t border-surface-high px-4 py-4 space-y-4 bg-surface-low/20">
                  <PermissionToggles user={u} draft={draft} onChange={(next) => setDraft(u.id, next)} />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={savingId === u.id}
                      onClick={() => void save(u.id)}
                    >
                      {savingId === u.id ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => resetRow(u)}>
                      إعادة ضبط العرض
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {targets.length === 0 && (
        <div className="text-sm text-ink-mute py-6 text-center">لا يوجد أطباء أو استقبال لعرضهم.</div>
      )}
    </div>
  );
}

function PermissionToggles({ user, draft, onChange }) {
  const rows = PERMISSION_ROWS.filter((r) => {
    if (r.whenBillingObject && typeof draft.billing !== "object") return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map((row) => (
        <label
          key={row.path.join(".")}
          className="flex items-center justify-between gap-3 rounded-lg border border-surface-high/80 bg-white px-3 py-2.5 dark:bg-[rgba(22,29,41,0.6)]"
        >
          <span className="text-sm text-ink">{row.label}</span>
          <input
            type="checkbox"
            className="w-4 h-4 accent-primary shrink-0"
            checked={readPath(draft, row.path)}
            onChange={(e) => onChange(writePath(draft, row.path, e.target.checked))}
            disabled={user.role === "doctor" && row.path[0] === "billing" && typeof draft.billing !== "object"}
          />
        </label>
      ))}
    </div>
  );
}

const PERMISSION_ROWS = [
  { label: "لوحة التحكم", path: ["dashboard"] },
  { label: "عرض المواعيد", path: ["appointments", "view"] },
  { label: "إنشاء مواعيد (حجز)", path: ["appointments", "create"] },
  { label: "تعديل المواعيد", path: ["appointments", "edit"] },
  { label: "عرض المرضى", path: ["patients", "view"] },
  { label: "إضافة مرضى", path: ["patients", "create"] },
  { label: "تعديل بيانات المرضى", path: ["patients", "edit"] },
  { label: "ملاحظات سريرية للمرضى", path: ["patients", "notes"] },
  { label: "عرض الفواتير والمحاسبة", path: ["billing", "view"], whenBillingObject: true },
  { label: "تسجيل دفعات / فواتير", path: ["billing", "create"], whenBillingObject: true },
  { label: "تقارير الإيرادات", path: ["billing", "reports"], whenBillingObject: true },
  { label: "التقارير العامة", path: ["reports"] },
  { label: "المخزون", path: ["inventory"] },
  { label: "الإعدادات", path: ["settings"] },
  { label: "عرض الإجراءات الطبية", path: ["procedures", "view"] },
  { label: "إدارة الإجراءات", path: ["procedures", "manage"] },
  { label: "الحجز الذكي (AI)", path: ["aiBooking"] },
];

function readPath(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return false;
    cur = cur[p];
  }
  return Boolean(cur);
}

function writePath(obj, parts, val) {
  const clone = structuredClone(obj);
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const next = cur[p];
    if (next == null || typeof next !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = val;
  return clone;
}

function GeneralAccountCard({ refreshProfile }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  const saveName = async () => {
    setErr("");
    setMsg("");
    try {
      await api.patchAccountProfile({ name: name.trim() });
      await refreshProfile?.();
      setMsg("تم تحديث الاسم.");
    } catch (e) {
      setErr(e.message || "تعذر الحفظ");
    }
  };

  const savePassword = async () => {
    setErr("");
    setMsg("");
    try {
      await api.patchAccountPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setMsg("تم تغيير كلمة المرور.");
    } catch (e) {
      setErr(e.message || "تعذر تغيير كلمة المرور");
    }
  };

  return (
    <div className="rounded-xl border border-surface-high bg-surface-low/30 p-4 mb-2 space-y-4">
      <div className="label-caps text-primary">الحساب والأمان</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="label-caps">البريد الإلكتروني</label>
          <input className="input mt-1.5 opacity-70" readOnly value={user?.email || ""} />
        </div>
        <div>
          <label className="label-caps">الاسم المعروض</label>
          <input className="input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button type="button" className="btn-primary w-full md:w-auto" onClick={() => void saveName()}>
            حفظ الاسم
          </button>
        </div>
      </div>
      <div className="border-t border-surface-high pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label-caps">كلمة المرور الحالية</label>
          <input
            type="password"
            className="input mt-1.5"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="label-caps">كلمة المرور الجديدة</label>
          <input
            type="password"
            className="input mt-1.5"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="md:col-span-2">
          <button type="button" className="btn-primary" onClick={() => void savePassword()}>
            تحديث كلمة المرور
          </button>
        </div>
      </div>
      {msg && <div className="text-xs text-secondary font-semibold">{msg}</div>}
      {err && <div className="text-xs text-danger font-semibold">{err}</div>}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <label className="label-caps">{label}</label>
      <input className="input mt-1.5" defaultValue={value} />
    </div>
  );
}
