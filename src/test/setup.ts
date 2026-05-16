import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom ships neither IntersectionObserver nor matchMedia. Catalog lazy-loading
// uses IntersectionObserver, and animation helpers can read matchMedia. Provide
// inert stubs so component tests don't blow up. The observer never fires, so
// lazy-load states stay inactive; matchMedia reports "no preference".
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

const allowedConsoleNoise = [
  /UI error caught by boundary/u,
  /The above error occurred/u,
  /React will try to recreate this component tree/u,
  /inside a test was not wrapped in act/u,
];

const failUnexpectedConsole = (method: "error" | "warn"): void => {
  vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
    const message = args.map((arg) => (typeof arg === "string" ? arg : String(arg))).join(" ");
    if (allowedConsoleNoise.some((pattern) => pattern.test(message))) return;
    throw new Error(`Unexpected console.${method}: ${message}`);
  });
};

beforeEach(() => {
  failUnexpectedConsole("error");
  failUnexpectedConsole("warn");
});

afterEach(() => {
  vi.restoreAllMocks();
});
