import { NavigationType, useNavigationType } from "react-router-dom";

/**
 * Skip first-paint animations that would delay LCP without UX benefit.
 * Returns true for POP navigations (initial load, browser back) where content
 * is either prerendered or coming from bfcache — no fade-in needed.
 * Returns false for PUSH/REPLACE (user-initiated navigations) so transitions play.
 *
 * Using navigation type instead of a first-render flag fixes lazy-loaded routes:
 * their chunks may load seconds after the initial navigation, but the type is
 * still POP, so they correctly skip animations regardless of timing.
 */
export const useIsInitialRender = (): boolean => {
  return useNavigationType() !== NavigationType.Push;
};
