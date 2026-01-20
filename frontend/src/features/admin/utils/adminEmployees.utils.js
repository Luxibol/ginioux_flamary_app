/**
 * Utils — Admin employés : rôles disponibles + helpers d’affichage.
 */

export const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "BUREAU", label: "Bureau" },
  { value: "PRODUCTION", label: "Production" },
];

/**
 * Formate le nom complet d’un employé : "NOM Prénom".
 * @param {{ first_name?: string, last_name?: string }} u
 * @returns {string}
 */
export function formatFullName(u) {
  const fn = String(u.first_name || "").trim();
  const ln = String(u.last_name || "")
    .trim()
    .toUpperCase();
  return `${ln} ${fn}`.trim();
}
