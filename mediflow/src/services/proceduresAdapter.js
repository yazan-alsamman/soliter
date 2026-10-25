import { DEFAULT_SERVICE_TEMPLATES } from "../data/services.js";

export function buildInitialProcedures(doctors = []) {
  return doctors.flatMap((doctor) =>
    DEFAULT_SERVICE_TEMPLATES.map((service) => ({
      id: `PR-${doctor.id}-${service.id}`,
      doctorId: doctor.id,
      name: service.name,
      price: Number(service.price) || 0,
      duration: Number(service.duration) || 1,
      category: service.category || "general",
      active: true,
      aliases: service.aliases || [],
    }))
  );
}

export function validateProcedurePayload(payload) {
  const name = String(payload.name || "").trim();
  if (!name) return "اسم الإجراء مطلوب";
  const price = Number(payload.price);
  if (!Number.isFinite(price) || price <= 0) return "السعر المبدئي يجب أن يكون أكبر من صفر";
  const duration = Number(payload.duration);
  if (!Number.isFinite(duration) || duration <= 0) return "المدة يجب أن تكون أكبر من صفر";
  return null;
}
