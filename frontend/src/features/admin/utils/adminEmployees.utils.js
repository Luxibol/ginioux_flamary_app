export function formatFullName(u) {
  const fn = String(u.first_name || "").trim();
  const ln = String(u.last_name || "")
    .trim()
    .toUpperCase();
  return `${ln} ${fn}`.trim();
}
