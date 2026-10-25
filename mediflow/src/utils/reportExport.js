import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/** Unicode Arabic-capable font for jsPDF (Helvetica cannot render Arabic → mojibake). */
const PDF_FONT_FAMILY = "NotoSansArabic";
const PDF_FONT_FILES = {
  regular: "NotoSansArabic-Regular.ttf",
  bold: "NotoSansArabic-Bold.ttf",
};

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function pdfFontHref(fileName) {
  const base = import.meta.env.BASE_URL || "/";
  const path = `${base.endsWith("/") ? base : `${base}/`}fonts/${fileName}`;
  try {
    const root =
      typeof document !== "undefined" ? document.baseURI : typeof window !== "undefined" ? window.location.href : "/";
    return new URL(path, root).href;
  } catch {
    return path;
  }
}

let arabicFontPayloadPromise = null;

async function loadArabicFontPayloadOnce() {
  const regularFile = PDF_FONT_FILES.regular;
  const boldFile = PDF_FONT_FILES.bold;
  const [rRes, bRes] = await Promise.all([
    fetch(pdfFontHref(regularFile)),
    fetch(pdfFontHref(boldFile)),
  ]);
  if (!rRes.ok) throw new Error(`Missing font file: ${regularFile}`);
  if (!bRes.ok) throw new Error(`Missing font file: ${boldFile}`);
  return {
    regularFile,
    boldFile,
    regularB64: arrayBufferToBase64(await rRes.arrayBuffer()),
    boldB64: arrayBufferToBase64(await bRes.arrayBuffer()),
  };
}

async function ensurePdfArabicFonts(doc) {
  if (!arabicFontPayloadPromise) {
    arabicFontPayloadPromise = loadArabicFontPayloadOnce();
  }
  const payload = await arabicFontPayloadPromise;
  doc.addFileToVFS(payload.regularFile, payload.regularB64);
  doc.addFileToVFS(payload.boldFile, payload.boldB64);
  doc.addFont(payload.regularFile, PDF_FONT_FAMILY, "normal", undefined, "Identity-H");
  doc.addFont(payload.boldFile, PDF_FONT_FAMILY, "bold", undefined, "Identity-H");
}

function pdfSetFont(doc, weight = "normal") {
  doc.setFont(PDF_FONT_FAMILY, weight === "bold" ? "bold" : "normal");
}

/* Force Latin numerals — clinic prefers western digits in exports. */
const SHEET_OPTS = { cellStyles: true };

/* ── Excel export ─────────────────────────────────────────────────────────── */

export function exportReportExcel({
  fileName = "mediflow-report.xlsx",
  selection = {
    kpis: true, revenue: true, departments: true, doctors: true,
    payments: true, services: true, patientFlow: true, outstanding: true,
    appointments: false, invoices: false, patients: false,
  },
  kpis = [],
  revenueByMonth = [],
  deptVolume = [],
  doctorLoad = [],
  paymentMix = [],
  topServices = [],
  patientFlow = [],
  outstanding = [],
  appointments = [],
  invoices = [],
  patients = [],
} = {}) {
  const wb = XLSX.utils.book_new();

  const add = (key, sheetName, rows, widths) => {
    if (!selection[key]) return;
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    if (widths) ws["!cols"] = widths;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  add("kpis", "KPIs", kpis, [{ wch: 28 }, { wch: 22 }, { wch: 36 }]);
  add("revenue", "Revenue", revenueByMonth, [{ wch: 14 }, { wch: 14 }, { wch: 14 }]);
  add("departments", "Departments", deptVolume, [{ wch: 22 }, { wch: 14 }]);
  add("doctors", "Doctors", doctorLoad, [{ wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 16 }]);
  add("payments", "Payments", paymentMix, [{ wch: 16 }, { wch: 14 }, { wch: 18 }]);
  add("services", "Services", topServices, [{ wch: 32 }, { wch: 14 }, { wch: 16 }]);
  add("patientFlow", "Patient_Flow", patientFlow, [{ wch: 14 }, { wch: 14 }, { wch: 14 }]);
  add("outstanding", "Outstanding", outstanding, [{ wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 16 }]);
  add(
    "appointments", "Appointments", appointments,
    appointments[0] ? Array(Object.keys(appointments[0]).length).fill({ wch: 18 }) : null
  );
  add(
    "invoices", "Invoices", invoices,
    invoices[0] ? Array(Object.keys(invoices[0]).length).fill({ wch: 18 }) : null
  );
  add(
    "patients", "Patients", patients,
    patients[0] ? Array(Object.keys(patients[0]).length).fill({ wch: 18 }) : null
  );

  if (wb.SheetNames.length === 0) {
    // Always provide at least an info sheet so the file isn't empty
    const ws = XLSX.utils.json_to_sheet([{ note: "No sections selected for export." }]);
    XLSX.utils.book_append_sheet(wb, ws, "Info");
  }

  XLSX.writeFile(wb, fileName, SHEET_OPTS);
}

/* ── PDF export — premium, summary-first ──────────────────────────────────── */

const C = {
  primary: [14, 116, 144],     // teal
  primaryDark: [10, 86, 105],
  primarySoft: [207, 250, 254],
  ink: [15, 23, 42],
  inkVariant: [55, 65, 81],
  inkMute: [107, 114, 128],
  surface: [243, 246, 250],
  border: [220, 224, 230],
  success: [16, 185, 129],
  warn: [217, 119, 6],
  danger: [220, 38, 38],
  white: [255, 255, 255],
};

function drawCoverHeader(doc, title, subtitle) {
  const w = doc.internal.pageSize.getWidth();
  // Background band
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, w, 92, "F");
  // Decorative tint
  doc.setFillColor(...C.primaryDark);
  doc.rect(0, 76, w, 16, "F");
  // Brand
  doc.setTextColor(...C.white);
  pdfSetFont(doc, "bold");
  doc.setFontSize(22);
  doc.text("MediFlow", 36, 38);
  pdfSetFont(doc, "normal");
  doc.setFontSize(10);
  doc.setTextColor(207, 250, 254);
  doc.text("Clinical Operations Report", 36, 54);
  // Right block: title + subtitle
  pdfSetFont(doc, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  doc.text(title, w - 36, 38, { align: "right" });
  pdfSetFont(doc, "normal");
  doc.setFontSize(9);
  doc.setTextColor(207, 250, 254);
  doc.text(subtitle, w - 36, 54, { align: "right" });
  // Generated date small line
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, w - 36, 82, { align: "right" });
}

function drawKpiHero(doc, kpis, startY) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 36;
  const cardW = (w - margin * 2 - 12) / 2;
  const cardH = 64;

  // Limit hero to 4 most-important rows; rest go in table below
  const hero = kpis.slice(0, 4);
  hero.forEach((k, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cardW + 12);
    const y = startY + row * (cardH + 10);
    doc.setFillColor(...C.surface);
    doc.roundedRect(x, y, cardW, cardH, 8, 8, "F");
    doc.setDrawColor(...C.border);
    doc.roundedRect(x, y, cardW, cardH, 8, 8, "S");
    doc.setTextColor(...C.inkMute);
    pdfSetFont(doc, "normal");
    doc.setFontSize(8);
    doc.text(String(k.metric ?? ""), x + 14, y + 18);
    doc.setTextColor(...C.ink);
    pdfSetFont(doc, "bold");
    doc.setFontSize(15);
    doc.text(String(k.value ?? ""), x + 14, y + 40);
    if (k.note) {
      doc.setTextColor(...C.inkMute);
      pdfSetFont(doc, "normal");
      doc.setFontSize(8);
      doc.text(k.note, x + 14, y + 56);
    }
  });

  const heroRows = Math.ceil(hero.length / 2);
  return startY + heroRows * (cardH + 10) + 6;
}

function drawSectionTitle(doc, text, y, sub = null) {
  const w = doc.internal.pageSize.getWidth();
  doc.setTextColor(...C.ink);
  pdfSetFont(doc, "bold");
  doc.setFontSize(13);
  doc.text(text, 36, y);
  if (sub) {
    doc.setTextColor(...C.inkMute);
    pdfSetFont(doc, "normal");
    doc.setFontSize(9);
    doc.text(sub, 36, y + 14);
  }
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(2);
  doc.line(36, y + (sub ? 22 : 8), 86, y + (sub ? 22 : 8));
  doc.setLineWidth(0.5);
  doc.setDrawColor(...C.border);
  doc.line(86, y + (sub ? 22 : 8), w - 36, y + (sub ? 22 : 8));
  return y + (sub ? 32 : 18);
}

function ensureSpace(doc, y, needed = 80) {
  if (y + needed > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    return 50;
  }
  return y;
}

function tableSection(doc, y, head, body) {
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    styles: { font: PDF_FONT_FAMILY, fontStyle: "normal", fontSize: 9, textColor: C.ink },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontSize: 10,
      fontStyle: "bold",
      font: PDF_FONT_FAMILY,
    },
    bodyStyles: { font: PDF_FONT_FAMILY, fontStyle: "normal", fontSize: 9, textColor: C.ink },
    alternateRowStyles: { fillColor: C.surface },
    theme: "striped",
    margin: { left: 36, right: 36 },
  });
  return doc.lastAutoTable.finalY + 18;
}

function drawFooter(doc) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...C.border);
    doc.line(36, h - 30, w - 36, h - 30);
    doc.setTextColor(...C.inkMute);
    pdfSetFont(doc, "normal");
    doc.setFontSize(8);
    doc.text("MediFlow Clinical Operations · Confidential", 36, h - 18);
    doc.text(`Page ${i} / ${pages}`, w - 36, h - 18, { align: "right" });
  }
}

export async function exportReportPdf({
  fileName = "mediflow-report.pdf",
  title = "Clinical Operations Report",
  subtitle = "",
  selection = {
    kpis: true, revenue: true, departments: true, doctors: true,
    payments: true, services: true, outstanding: true,
  },
  kpis = [],
  revenueByMonth = [],
  deptVolume = [],
  doctorLoad = [],
  paymentMix = [],
  topServices = [],
  outstanding = [],
} = {}) {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  await ensurePdfArabicFonts(doc);
  pdfSetFont(doc, "normal");

  drawCoverHeader(doc, title, subtitle);

  let y = 110;

  if (selection.kpis && kpis.length) {
    y = drawSectionTitle(doc, "Key Performance Indicators", y, "Snapshot of operational health");
    y = drawKpiHero(doc, kpis, y);
    if (kpis.length > 4) {
      y = ensureSpace(doc, y, 100);
      y = tableSection(
        doc, y,
        ["Metric", "Value", "Note"],
        kpis.slice(4).map((k) => [k.metric, String(k.value ?? ""), k.note ?? ""])
      );
    }
  }

  if (selection.revenue && revenueByMonth.length) {
    y = ensureSpace(doc, y, 140);
    const total = revenueByMonth.reduce((s, r) => s + Number(String(r.revenue || "").replace(/[^\d.-]/g, "")) || 0, 0);
    y = drawSectionTitle(
      doc, "Monthly Revenue", y,
      `${revenueByMonth.length} months · cash collected`
    );
    y = tableSection(
      doc, y,
      ["Month", "Revenue", "Invoices"],
      revenueByMonth.map((r) => [r.month, r.revenue, r.invoices])
    );
    if (total > 0) {
      doc.setTextColor(...C.inkMute);
      doc.setFontSize(8);
      doc.text(`Total cash collected across listed months: ${total}`, 36, y);
      y += 14;
    }
  }

  if (selection.departments && deptVolume.length) {
    y = ensureSpace(doc, y, 140);
    y = drawSectionTitle(doc, "Department Volume", y, "Appointments distribution");
    y = tableSection(
      doc, y,
      ["Department", "Appointments"],
      deptVolume.map((d) => [d.department, d.count])
    );
  }

  if (selection.doctors && doctorLoad.length) {
    y = ensureSpace(doc, y, 140);
    y = drawSectionTitle(doc, "Doctor Performance", y, "Ranked by revenue");
    y = tableSection(
      doc, y,
      ["Doctor", "Department", "Appointments", "Revenue"],
      doctorLoad.map((d) => [d.doctor, d.department, d.appointments, d.revenue])
    );
  }

  if (selection.payments && paymentMix.length) {
    y = ensureSpace(doc, y, 140);
    y = drawSectionTitle(doc, "Payment Status", y, "How invoices are settled");
    y = tableSection(
      doc, y,
      ["Status", "Invoices", "Total Amount"],
      paymentMix.map((p) => [p.status, p.count, p.amount])
    );
  }

  if (selection.services && topServices.length) {
    y = ensureSpace(doc, y, 140);
    y = drawSectionTitle(doc, "Top Services", y, "Most requested treatments");
    y = tableSection(
      doc, y,
      ["Service", "Count", "Revenue"],
      topServices.map((s) => [s.service, s.count, s.revenue])
    );
  }

  if (selection.outstanding && outstanding.length) {
    y = ensureSpace(doc, y, 140);
    y = drawSectionTitle(
      doc, "Outstanding Balances", y,
      `${outstanding.length} unpaid / partial invoices`
    );
    y = tableSection(
      doc, y,
      ["Patient", "Date", "Status", "Balance"],
      outstanding.map((o) => [o.patient, o.date, o.status, o.balance])
    );
  }

  drawFooter(doc);
  doc.save(fileName);
}
