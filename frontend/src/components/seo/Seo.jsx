/**
 * SEO minimal (SPA) :
 * - document.title
 * - meta description (optionnel)
 * - canonical (optionnel)
 *
 * Sans dépendance externe.
 */
import { useEffect } from "react";

function upsertMeta(name, content) {
  if (!content) return;
  const head = document.head;
  if (!head) return;

  let el = head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href) {
  if (!href) return;
  const head = document.head;
  if (!head) return;

  let el = head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function Seo({ title, description, canonical }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) upsertMeta("description", description);

    // canonical : on accepte une valeur relative (ex: "/bureau")
    if (canonical) {
      const href = canonical.startsWith("http")
        ? canonical
        : new URL(canonical, window.location.origin).toString();
      upsertCanonical(href);
    }
  }, [title, description, canonical]);

  return null;
}
