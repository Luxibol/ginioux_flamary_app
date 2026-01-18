import { useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { getOrderComments, postOrderComment } from "../../services/orders.api.js";

export default function OrderCommentsThread({
  orderId,
  open = true,
  onCountsChange,
  className = "",
  readOnly = false,

  // UI
  showHeader = true,
  collapsible = true,
  defaultCollapsed = true,

  // ✅ NEW: contrôlé par le parent (si fourni)
  collapsed: collapsedProp,
  onCollapsedChange,
}) {
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const [comments, setComments] = useState([]);
  const [messagesCount, setMessagesCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const [content, setContent] = useState("");

  // ✅ local fallback si pas contrôlé
  const [collapsedLocal, setCollapsedLocal] = useState(Boolean(defaultCollapsed));

  const collapsed =
    typeof collapsedProp === "boolean" ? collapsedProp : collapsedLocal;

  const setCollapsed = (next) => {
    const v = Boolean(next);
    if (typeof collapsedProp === "boolean") {
      // mode contrôlé
      onCollapsedChange?.(v);
    } else {
      // mode local
      setCollapsedLocal(v);
      onCollapsedChange?.(v);
    }
  };

  async function load() {
    if (!orderId) return;

    setLoading(true);
    setError("");
    try {
      const res = await getOrderComments(orderId);
      const mc = Number(res?.messagesCount ?? 0);
      const uc = Number(res?.unreadCount ?? 0);

      setComments(res?.data || []);
      setMessagesCount(mc);
      setUnreadCount(uc);

      onCountsChange?.(orderId, { messagesCount: mc, unreadCount: uc });
    } catch (e) {
      setError(e?.message || "Erreur chargement commentaires.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (readOnly) return;
    const text = String(content || "").trim();
    if (!text) return;

    setPosting(true);
    setError("");
    try {
      const res = await postOrderComment(orderId, text);
      const mc = Number(res?.messagesCount ?? 0);
      const uc = Number(res?.unreadCount ?? 0);

      setComments(res?.data || []);
      setMessagesCount(mc);
      setUnreadCount(uc);

      onCountsChange?.(orderId, { messagesCount: mc, unreadCount: uc });

      setContent("");
      setCollapsed(false); // ✅ ouvrir après envoi
    } catch (e) {
      setError(e?.message || "Erreur ajout commentaire.");
    } finally {
      setPosting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!orderId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  if (!open) return null;

  const canToggle = showHeader && collapsible;

  return (
    <div className={`rounded-lg bg-gf-bg p-3 ring-1 ring-gf-border ${className}`}>
      {showHeader ? (
        <button
          type="button"
          onClick={() => canToggle && setCollapsed(!collapsed)}
          className={`w-full flex items-center justify-between gap-2 ${
            canToggle ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <div className="text-xs font-medium text-gf-title">
            Commentaires{" "}
            <span className="text-gf-subtitle font-normal">({messagesCount})</span>
            {unreadCount > 0 ? (
              <span className="ml-2 text-[11px] text-gf-subtitle">
                • Non lus : {unreadCount}
              </span>
            ) : null}
          </div>

          {canToggle ? (
            collapsed ? (
              <ChevronDown className="h-4 w-4 text-gf-subtitle" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gf-subtitle" />
            )
          ) : null}
        </button>
      ) : null}

      {collapsed ? null : (
        <>
          {error ? <div className="mt-2 text-xs text-gf-danger">{error}</div> : null}

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="text-xs text-gf-subtitle">Chargement…</div>
            ) : comments.length === 0 ? (
              <div className="text-xs text-gf-subtitle">Aucun commentaire.</div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md bg-gf-surface px-3 py-2 ring-1 ring-gf-border"
                >
                  <div className="text-[11px] text-gf-subtitle">
                    {c.first_name} {c.last_name} •{" "}
                    {new Date(c.created_at).toLocaleString("fr-FR")}
                  </div>
                  <div className="mt-1 text-xs text-gf-text whitespace-pre-wrap">
                    {c.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {!readOnly ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="Ajouter un commentaire…"
                inputMode="text"
                enterKeyHint="send"
                className="h-9 flex-1 rounded-md border border-gf-border bg-gf-surface px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
              />

              <button
                type="button"
                onClick={submit}
                disabled={posting || !String(content).trim()}
                className="h-9 w-10 rounded-md bg-gf-orange text-white grid place-items-center hover:opacity-90 disabled:opacity-60"
                title="Envoyer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
