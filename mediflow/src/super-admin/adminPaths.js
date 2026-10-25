/** Resolve /admin (or {basename}/admin) prefix from the current location. */
export function adminBasePath(pathname) {
  const marker = "/admin";
  const i = pathname.indexOf(marker);
  if (i < 0) return "/admin";
  return pathname.slice(0, i + marker.length);
}
