export function loginWithLocalUsers(users, { username, password }) {
  const uname = String(username || "").trim().toLowerCase();
  const pass = String(password || "");
  const user = users.find((item) => item.username.toLowerCase() === uname);
  if (!user) return { ok: false, message: "المستخدم غير موجود" };
  if (!user.active) return { ok: false, message: "هذا الحساب معطّل" };
  if (pass && user.tempPassword && pass !== user.tempPassword) {
    return { ok: false, message: "كلمة المرور غير صحيحة" };
  }
  return { ok: true, userId: user.id };
}
