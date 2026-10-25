/** Mirrors backend `notification-message.util.ts` for actionable notification payloads. */
export const MF_JSON_SEP = "|||MF_JSON|||";

export function unpackNotificationMessage(message) {
  const idx = message.indexOf(MF_JSON_SEP);
  if (idx === -1) return { text: message, meta: null };
  const text = message.slice(0, idx);
  try {
    const meta = JSON.parse(message.slice(idx + MF_JSON_SEP.length));
    return { text, meta: meta && typeof meta === "object" ? meta : null };
  } catch {
    return { text: message, meta: null };
  }
}
