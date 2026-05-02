import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("runs vitest with jsdom environment", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });

  it("loads jest-dom matchers", () => {
    const div = document.createElement("div");
    div.textContent = "ok";
    expect(div).toHaveTextContent("ok");
  });
});
