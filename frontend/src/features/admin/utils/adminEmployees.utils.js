export const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "BUREAU", label: "Bureau" },
  { value: "PRODUCTION", label: "Production" },
];

export function formatFullName(u) {
  const fn = String(u.first_name || "").trim();
  const ln = String(u.last_name || "")
    .trim()
    .toUpperCase();
  return `${ln} ${fn}`.trim();
}
