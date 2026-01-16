import { apiFetch } from "./apiClient.js";

export function listUsers({ q, role, active } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  if (active !== undefined && active !== "")
    params.set("active", String(active));

  const qs = params.toString();
  return apiFetch(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function createUser(payload) {
  return apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchUser(id, patch) {
  return apiFetch(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function resetUserPassword(id) {
  return apiFetch(`/admin/users/${id}/reset-password`, {
    method: "POST",
  });
}
