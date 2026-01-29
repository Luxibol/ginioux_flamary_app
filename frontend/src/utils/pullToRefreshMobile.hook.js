import { useContext } from "react";
import { PullToRefreshMobileContext } from "./pullToRefreshMobile.context.js";

export function usePullToRefreshMobile() {
  const ctx = useContext(PullToRefreshMobileContext);
  if (!ctx) {
    return {
      registerRefresh: () => () => {},
      pull: 0,
      refreshing: false,
      enabled: false,
    };
  }
  return ctx;
}
