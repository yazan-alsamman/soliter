export const DEFAULT_SERVICE_TEMPLATES = [
  {
    id: "consultation",
    name: "استشارة",
    price: 180,
    duration: 1,
    category: "dental",
    aliases: ["consultation"],
  },
  { id: "botox", name: "بوتوكس", price: 900, duration: 0.5, category: "aesthetic", aliases: ["botox"] },
  { id: "filler", name: "فيلر", price: 1200, duration: 1, category: "aesthetic", aliases: ["filler"] },
  {
    id: "laser_session",
    name: "جلسة ليزر",
    price: 700,
    duration: 1,
    category: "laser",
    aliases: ["laser session", "laser_session"],
  },
];

export const SERVICE_CATALOG = DEFAULT_SERVICE_TEMPLATES;

function buildByNameMap(services) {
  const byName = new Map();
  for (const service of services || []) {
    byName.set(service.name.toLowerCase(), service);
    for (const alias of service.aliases || []) {
      byName.set(String(alias).toLowerCase(), service);
    }
  }
  return byName;
}

export function getDoctorServices(procedures = [], doctorId) {
  if (!doctorId) return [];
  return procedures.filter((procedure) => procedure.doctorId === doctorId && procedure.active !== false);
}

export function getServiceByName(name, options = {}) {
  const { procedures = [], doctorId } = options;
  const pool = doctorId ? getDoctorServices(procedures, doctorId) : [];
  const candidates = pool.length ? pool : SERVICE_CATALOG;
  const byName = buildByNameMap(candidates);
  if (!name) return candidates[0];
  return byName.get(String(name).trim().toLowerCase()) || candidates[0];
}
