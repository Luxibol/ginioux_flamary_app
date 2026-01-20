/**
 * SEO minimal :
 * - document.title
 * - meta description (optionnel)
 * - canonical (optionnel)
 *
 * Sans dépendance externe.
 */
import { useEffect } from "react";

/**
 * Crée ou met à jour une meta name="...".
 * @param {string} name Nom de la meta
 * @param {string} content Contenu
 * @returns {void}
 */
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

/**
 * Crée ou met à jour la balise canonical.
 * @param {string} href URL canonique absolue
 * @returns {void}
 */
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

/**
 * SEO minimal (SPA) : title / description / canonical.
 * @param {object} props
 * @param {string} [props.title] Titre document
 * @param {string} [props.description] Meta description
 * @param {string} [props.canonical] URL canonique (relative "/..." ou absolue)
 * @returns {null}
 */
export default function Seo({ title, description, canonical }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) upsertMeta("description", description);

    if (canonical) {
      const href = canonical.startsWith("http")
        ? canonical
        : new URL(canonical, window.location.origin).toString();
      upsertCanonical(href);
    }
  }, [title, description, canonical]);

  return null;
}
