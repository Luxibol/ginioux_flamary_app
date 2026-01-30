import { useCallback, useMemo, useRef } from "react";
import { usePullToRefresh } from "./usePullToRefresh.js";
import { PullToRefreshMobileContext } from "./pullToRefreshMobile.context.js";

export function PullToRefreshMobileProvider({
  children,
  enabled = false,
  getScrollTop,
}) {
  const refreshFnRef = useRef(null);

  const registerRefresh = useCallback((fn) => {
    refreshFnRef.current = typeof fn === "function" ? fn : null;
    return () => {
      if (refreshFnRef.current === fn) refreshFnRef.current = null;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    if (!refreshFnRef.current) return;
    await refreshFnRef.current();
  }, []);

  const { pull, refreshing } = usePullToRefresh({
    enabled,
    onRefresh,
    getScrollTop,
    threshold: 60,
    maxPull: 120,
    cooldownMs: 800,
  });

  const value = useMemo(
    () => ({ enabled, pull, refreshing, registerRefresh }),
    [enabled, pull, refreshing, registerRefresh],
  );

  return (
    <PullToRefreshMobileContext.Provider value={value}>
      {children}
    </PullToRefreshMobileContext.Provider>
  );
}

export function PullToRefreshIndicator({ top = 64 }) {
  return (
    <PullToRefreshMobileContext.Consumer>
      {(ctx) => {
        if (!ctx || !ctx.enabled) return null;

        const show = ctx.pull > 0 || ctx.refreshing;
        if (!show) return null;

        const translate = Math.min(40, Math.round(ctx.pull * 0.4));

        return (
          <div
            className="fixed left-0 right-0 z-50 pointer-events-none"
            style={{ top }}
          >
            <div
              className="mx-auto w-fit rounded-full border border-gf-border bg-gf-surface px-3 py-1 text-xs text-gf-subtitle shadow-sm"
              style={{ transform: `translateY(${translate}px)` }}
            >
              {ctx.refreshing ? "Actualisation…" : "Tirez pour actualiser"}
            </div>
          </div>
        );
      }}
    </PullToRefreshMobileContext.Consumer>
  );
}
