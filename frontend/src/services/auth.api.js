import { apiFetch } from "./apiClient.js";

export function login({ login, password }) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

export function changePassword({ new_password }) {
  return apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ new_password }),
  });
}
