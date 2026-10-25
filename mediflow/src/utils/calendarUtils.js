// ─── Calendar constants ────────────────────────────────────────────────────
export const GRID_START = 8;   // 8:00 AM
export const GRID_END   = 21;  // 9:00 PM
export const ROW_H      = 68;  // px per hour

// Half-hour slots for the time grid
export const SLOTS = [];
for (let h = GRID_START; h <= GRID_END; h++) {
  SLOTS.push({ hour: h, min: 0,  decimal: h,       isHour: true  });
  if (h < GRID_END)
  SLOTS.push({ hour: h, min: 30, decimal: h + 0.5, isHour: false });
}

// ─── Date helpers ──────────────────────────────────────────────────────────

export function getSundayOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function formatTime(decimal) {
  const h = Math.floor(decimal);
  const m = Math.round((decimal % 1) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function decimalFromDate(date) {
  return date.getHours() + date.getMinutes() / 60;
}

export function apptDate(appt) {
  return appt.appointmentStart ? new Date(appt.appointmentStart) : null;
}

// ─── Arabic formatters ─────────────────────────────────────────────────────

export function fmtDay(date) {
  return new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

export function fmtDayShort(date) {
  return new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', { weekday: 'short', day: 'numeric' }).format(date);
}

export function fmtMonth(date) {
  return new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' }).format(date);
}

export function fmtDayNum(date) {
  return new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', { day: 'numeric' }).format(date);
}

export const WEEK_LABELS_SHORT = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
export const WEEK_LABELS       = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

// ─── Status meta ───────────────────────────────────────────────────────────

export const STATUS_META = {
  scheduled:       { label: 'مجدول',       tw: 'bg-slate-100 text-slate-600 ring-slate-200'      },
  confirmed:       { label: 'مؤكد',        tw: 'bg-blue-50 text-blue-700 ring-blue-200'          },
  arrived:         { label: 'وصل',         tw: 'bg-amber-50 text-amber-700 ring-amber-200'       },
  in_consultation: { label: 'في الجلسة',   tw: 'bg-violet-50 text-violet-700 ring-violet-200'   },
  completed:       { label: 'اكتمل',       tw: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  paid:            { label: 'مدفوع',       tw: 'bg-green-100 text-green-800 ring-green-300'      },
  cancelled:       { label: 'ملغى',        tw: 'bg-red-50 text-red-600 ring-red-200'             },
  no_show:         { label: 'لم يحضر',    tw: 'bg-orange-50 text-orange-700 ring-orange-200'    },
};

// The next logical status a receptionist would want to move to
export const NEXT_STATUS = {
  scheduled:       'confirmed',
  confirmed:       'arrived',
  arrived:         'in_consultation',
  in_consultation: 'completed',
  completed:       'paid',
};

// ─── Overlap computation ───────────────────────────────────────────────────

export function computeOverlaps(appointments) {
  const sorted = [...appointments].sort((a, b) => a.start - b.start);
  const result = new Map(); // id → { col, cols }

  for (let i = 0; i < sorted.length; i++) {
    const appt = sorted[i];
    const usedCols = new Set();

    for (let j = 0; j < i; j++) {
      const other = sorted[j];
      const overlaps =
        other.start < appt.start + appt.duration &&
        appt.start  < other.start + other.duration;
      if (overlaps) {
        const r = result.get(other.id);
        if (r) usedCols.add(r.col);
      }
    }

    let col = 0;
    while (usedCols.has(col)) col++;
    result.set(appt.id, { col, cols: 1 });
  }

  // Recalculate cols (= max columns in each overlap group)
  for (const appt of sorted) {
    const { col } = result.get(appt.id);
    let maxCol = col;
    for (const other of sorted) {
      if (other.id === appt.id) continue;
      const r = result.get(other.id);
      if (!r) continue;
      const overlaps =
        other.start < appt.start + appt.duration &&
        appt.start  < other.start + other.duration;
      if (overlaps) maxCol = Math.max(maxCol, r.col);
    }
    result.set(appt.id, { col, cols: maxCol + 1 });
  }

  return result;
}
