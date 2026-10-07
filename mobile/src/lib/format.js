export const fmtEUR = (n) =>
  `${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",")} €`;

export const fmtNum = (n) =>
  (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",");

export const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return ""; }
};

export const fmtDateTime = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

export const initials = (first = "", last = "") => {
  const a = (first || "").trim()[0] || "";
  const b = (last || "").trim()[0] || "";
  return (a + b).toUpperCase() || "?";
};

export const loyaltyTier = (pts) => {
  const p = Number(pts) || 0;
  if (p >= 2000) return { name: "VIP", min: 2000, next: null, color: "#f0abfc" };
  if (p >= 1000) return { name: "Fidèle", min: 1000, next: 2000, color: "#c084fc" };
  if (p >= 300) return { name: "Habitué", min: 300, next: 1000, color: "#a78bfa" };
  return { name: "Nouveau", min: 0, next: 300, color: "#8b5cf6" };
};
