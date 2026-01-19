export function landingPathForRole(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "BUREAU") return "/bureau";
  if (role === "PRODUCTION") return "/production/commandes";
  return "/bureau";
}
