/**
 * Cursor encoding compatible with Medi_BackEnd `sync.service` (base64url JSON).
 * @param {string} updatedAtIso
 * @param {string} id
 */
export function encodeCursor(updatedAtIso, id) {
  const json = JSON.stringify({ t: updatedAtIso, id });
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
