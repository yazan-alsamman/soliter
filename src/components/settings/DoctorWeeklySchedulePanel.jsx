import { useCallback, useEffect, useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { DAYS_AR } from "../../data/strings.js";
import { api } from "../../services/apiClient.js";

const DEFAULT_ROW = {
  startTime: "09:00",
  endTime: "17:00",
  breakStart: "",
  breakEnd: "",
};

function buildDraftFromRows(rows, doctorId) {
  const byDay = {};
  for (let d = 0; d <= 6; d++) {
    byDay[d] = { enabled: false, ...DEFAULT_ROW };
  }
  for (const r of rows || []) {
    if (r.doctorId !== doctorId) continue;
    if (r.deletedAt) continue;
    byDay[r.dayOfWeek] = {
      enabled: true,
      startTime: r.startTime || DEFAULT_ROW.startTime,
      endTime: r.endTime || DEFAULT_ROW.endTime,
      breakStart: r.breakStart || "",
      breakEnd: r.breakEnd || "",
    };
  }
  return byDay;
}

export default function DoctorWeeklySchedulePanel({ doctorId, title }) {
  const [draft, setDraft] = useState(() => buildDraftFromRows([], ""));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!doctorId) {
      setDraft(buildDraftFromRows([], ""));
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const rows = await api.getSchedules();
      const list = Array.isArray(rows) ? rows : [];
      setDraft(buildDraftFromRows(list, doctorId));
    } catch (e) {
      setErr(e.message || "تعذر تحميل جدول الدوام");
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDay = (d, patch) => {
    setDraft((prev) => ({
      ...prev,
      [d]: { ...prev[d], ...patch },
    }));
  };

  const saveAll = async () => {
    if (!doctorId) return;
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      for (let d = 0; d <= 6; d++) {
        const row = draft[d];
        if (!row.enabled) {
          await api.deleteSchedule(doctorId, d);
        } else {
          await api.upsertSchedule({
            doctorId,
            dayOfWeek: d,
            startTime: row.startTime,
            endTime: row.endTime,
            breakStart: row.breakStart && row.breakStart.trim() ? row.breakStart : undefined,
            breakEnd: row.breakEnd && row.breakEnd.trim() ? row.breakEnd : undefined,
          });
        }
      }
      setMsg("تم حفظ أيام ومواعيد الدوام.");
      await load();
    } catch (e) {
      setErr(e.message || "تعذر حفظ الجدول");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-soft/50 text-primary grid place-items-center shrink-0">
          <CalendarDaysIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink">{title || "دوام العمل"}</h3>
          <p className="text-xs text-ink-mute mt-0.5">
            فعّل الأيام التي تعمل فيها، وحدد بداية ونهاية الدوام. يمكنك إضافة استراحة اختيارية (مثلاً وقت الصلاة أو الغداء).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-ink-mute py-6">جارٍ التحميل...</div>
      ) : !doctorId ? (
        <div className="text-sm text-warn py-4">اختر طبيباً لعرض الجدول.</div>
      ) : (
        <div className="space-y-3">
          {DAYS_AR.map((day, d) => {
            const row = draft[d];
            return (
              <div
                key={day.key}
                className="rounded-xl border border-surface-high bg-surface-low/20 px-3 py-3 sm:px-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap"
              >
                <label className="flex items-center gap-2 shrink-0 min-w-[140px] cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary"
                    checked={row.enabled}
                    onChange={(e) => patchDay(d, { enabled: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-ink">{day.label}</span>
                </label>
                <div className="flex flex-wrap gap-2 flex-1 items-end opacity-100">
                  <div className={row.enabled ? "" : "opacity-40 pointer-events-none"}>
                    <span className="text-[10px] text-ink-mute block mb-1">من</span>
                    <input
                      type="time"
                      className="input h-10 w-[7.5rem]"
                      value={row.startTime}
                      onChange={(e) => patchDay(d, { startTime: e.target.value })}
                      disabled={!row.enabled}
                    />
                  </div>
                  <div className={row.enabled ? "" : "opacity-40 pointer-events-none"}>
                    <span className="text-[10px] text-ink-mute block mb-1">إلى</span>
                    <input
                      type="time"
                      className="input h-10 w-[7.5rem]"
                      value={row.endTime}
                      onChange={(e) => patchDay(d, { endTime: e.target.value })}
                      disabled={!row.enabled}
                    />
                  </div>
                  <div className={row.enabled ? "" : "opacity-40 pointer-events-none"}>
                    <span className="text-[10px] text-ink-mute block mb-1">بداية الاستراحة</span>
                    <input
                      type="time"
                      className="input h-10 w-[7.5rem]"
                      value={row.breakStart}
                      onChange={(e) => patchDay(d, { breakStart: e.target.value })}
                      disabled={!row.enabled}
                    />
                  </div>
                  <div className={row.enabled ? "" : "opacity-40 pointer-events-none"}>
                    <span className="text-[10px] text-ink-mute block mb-1">نهاية الاستراحة</span>
                    <input
                      type="time"
                      className="input h-10 w-[7.5rem]"
                      value={row.breakEnd}
                      onChange={(e) => patchDay(d, { breakEnd: e.target.value })}
                      disabled={!row.enabled}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {err && <div className="text-sm text-danger font-semibold">{err}</div>}
      {msg && <div className="text-sm text-secondary font-semibold">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={saving || loading || !doctorId}
          onClick={() => void saveAll()}
        >
          {saving ? "جارٍ الحفظ..." : "حفظ جدول الدوام"}
        </button>
        <button type="button" className="btn-ghost" disabled={loading || !doctorId} onClick={() => void load()}>
          إعادة التحميل
        </button>
      </div>
    </div>
  );
}
