import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { WaiverIcon, waiverIcon, type WaiverCategory } from "@/components/domain/WaiverIcon";

describe("waiverIcon helper", () => {
  it("returns a component for each documented category", () => {
    const categories: WaiverCategory[] = [
      "monthly_spend",
      "investment",
      "cashback",
      "miles",
      "general",
    ];
    for (const cat of categories) {
      const Icon = waiverIcon(cat);
      expect(typeof Icon).toBe("object");
    }
  });

  it("falls back to ShieldCheck for unknown category", () => {
    const general = waiverIcon("general");
    const fallback = waiverIcon("not-a-real-category");
    expect(fallback).toBe(general);
  });
});

describe("WaiverIcon component", () => {
  it("renders a decorative svg by default", () => {
    const { container } = render(<WaiverIcon category="monthly_spend" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders with role=img when ariaLabel is provided", () => {
    const { container } = render(
      <WaiverIcon category="investment" ariaLabel="Isenção por investimento" />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Isenção por investimento");
  });

  it("uses the documented icon per category (snapshot of icon name)", () => {
    const cats: WaiverCategory[] = ["monthly_spend", "investment", "cashback", "miles", "general"];
    const seen = new Set<string>();
    for (const cat of cats) {
      const { container, unmount } = render(<WaiverIcon category={cat} />);
      const svg = container.querySelector("svg");
      const cls = svg?.getAttribute("class") ?? "";
      expect(cls).toMatch(/lucide/);
      seen.add(cls);
      unmount();
    }
    // Each category renders a distinct icon class
    expect(seen.size).toBe(cats.length);
  });
});
