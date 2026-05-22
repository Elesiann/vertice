import { useEffect, useRef } from "react";

let hasFirstRenderCompleted = false;

/**
 * Skip first-paint animations that would delay LCP without UX benefit. Returns
 * true only during the app's very first render across the tree; route changes
 * and subsequent re-mounts return false, so transition animations still play.
 */
export const useIsInitialRender = (): boolean => {
  const wasInitial = useRef(!hasFirstRenderCompleted);
  useEffect(() => {
    hasFirstRenderCompleted = true;
  }, []);
  return wasInitial.current;
};
