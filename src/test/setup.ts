import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom ships neither IntersectionObserver nor matchMedia. framer-motion's
// `useInView` (sticky filter bar) creates an IntersectionObserver, and
// `useReducedMotion` reads matchMedia. Provide inert stubs so component tests
// don't blow up. The observer never fires, so "stuck" / lazy-load states stay
// inactive; matchMedia reports "no preference" (animations are inert in jsdom).
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = vi.fn(() => ({
    root: null,
    rootMargin: "",
    thresholds: [],
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  }));
}

if (typeof globalThis.matchMedia === "undefined") {
  globalThis.matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }));
}
