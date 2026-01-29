import { useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh mobile (touch)
 * - Déclenche onRefresh quand on tire vers le bas en étant en haut
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 60,
  maxPull = 120,
  cooldownMs = 800,
  getScrollTop, // optionnel si container custom
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const getTop = () => {
      if (typeof getScrollTop === "function") return getScrollTop();
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const canStart = () => getTop() <= 0 && !refreshing;

    const onTouchStart = (e) => {
      if (!canStart()) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (e) => {
      if (!pullingRef.current) return;

      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }

      if (canStart()) e.preventDefault();

      const next = Math.min(maxPull, Math.round(dy * 0.6));
      setPull(next);
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;

      const now = Date.now();
      const okCooldown = now - lastRefreshRef.current > cooldownMs;

      if (pull >= threshold && okCooldown && typeof onRefresh === "function") {
        lastRefreshRef.current = now;
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [
    enabled,
    threshold,
    maxPull,
    cooldownMs,
    onRefresh,
    pull,
    refreshing,
    getScrollTop,
  ]);

  return { pull, refreshing };
}
