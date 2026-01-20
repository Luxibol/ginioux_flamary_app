export function formatKg(kg) {
  const n = Number(kg ?? 0);
  if (!Number.isFinite(n)) return "0 kg";
  return `${Math.round(n).toLocaleString("fr-FR")} kg`;
}

export function formatTons(kg) {
  const n = Number(kg ?? 0);
  if (!Number.isFinite(n)) return "0 t";
  return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} t`;
}
