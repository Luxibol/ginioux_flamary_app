const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function previewImport(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/pdf/preview`, {
    method: "POST",
    body: fd,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || "Erreur preview");
    err.status = res.status;
    err.data = data; // <= contient missingLabels
    throw err;
  }

  return data;
}

export async function confirmImport(importId, payload) {
  const res = await fetch(`${API_BASE}/pdf/${importId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });

  const data = await res.json().catch(() => ({}));

  // On laisse le front décider selon le status
  return { ok: res.ok, status: res.status, data };
}

export async function cancelImport(importId) {
  await fetch(`${API_BASE}/pdf/${importId}`, { method: "DELETE" });
}
