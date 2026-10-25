export function buildInitialUsers() {
  return [
    {
      id: "U-ADMIN-1",
      role: "admin",
      name: "د. هدى الفهد",
      title: "المديرة الطبية",
      initials: "هف",
      username: "admin",
      email: "admin@mediflow.health",
      active: true,
      tempPassword: "admin123",
      doctorId: null,
    },
    {
      id: "U-DOCTOR-1",
      role: "doctor",
      name: "د. أحمد المنصور",
      title: "طبيب باطنية",
      initials: "أم",
      username: "doctor1",
      email: "doctor1@mediflow.health",
      active: true,
      tempPassword: "doctor123",
      doctorId: "D1",
    },
    {
      id: "U-RECEPTION-1",
      role: "receptionist",
      name: "نورة الشهري",
      title: "موظفة استقبال",
      initials: "نش",
      username: "reception1",
      email: "reception1@mediflow.health",
      active: true,
      tempPassword: "recep123",
      doctorId: null,
    },
  ];
}

export function normalizeInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0] || "")
    .slice(0, 2)
    .join("") || "؟";
}

export function validateUserPayload(users, payload, ignoreId = null) {
  const name = String(payload.name || "").trim();
  const role = payload.role;
  const username = String(payload.username || "").trim().toLowerCase();
  const email = String(payload.email || "").trim().toLowerCase();
  if (!name) return "اسم المستخدم مطلوب";
  if (!["admin", "doctor", "receptionist"].includes(role)) return "الدور غير صالح";
  if (!username) return "اسم المستخدم مطلوب";
  if (!email) return "البريد الإلكتروني مطلوب";

  const duplicate = users.find(
    (u) =>
      u.id !== ignoreId &&
      (u.username.toLowerCase() === username || u.email.toLowerCase() === email)
  );
  if (duplicate) return "اسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً";
  return null;
}
