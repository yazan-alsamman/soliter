/** English category slugs on `Service.category` → Arabic labels */
export const PROCEDURE_CATEGORY_LABEL_AR = {
  dental: "أسنان",
  laser: "ليزر",
  skin: "عناية البشرة",
  skincare: "عناية البشرة",
  aesthetic: "تجميل",
  general: "عام",
};

export function categoryLabelAr(cat) {
  const key = String(cat || "general").trim() || "general";
  return PROCEDURE_CATEGORY_LABEL_AR[key] || key;
}
