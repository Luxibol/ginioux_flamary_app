import { apiFetch } from "./apiClient";

export async function getArchivedOrders({ q, period } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (period) params.set("period", period);
  const qs = params.toString();
  return apiFetch(`/orders/archived${qs ? `?${qs}` : ""}`);
}

export async function getArchivedOrderHistory(id) {
  return apiFetch(`/orders/${id}/history`);
}
