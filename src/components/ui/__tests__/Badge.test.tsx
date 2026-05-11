import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders its children with neutral tone by default", () => {
    render(<Badge>label</Badge>);
    const el = screen.getByText("label");
    expect(el).toHaveClass("bg-surface-sunken", "text-ink-muted");
  });

  it("applies gold tone classes", () => {
    render(<Badge tone="gold">x</Badge>);
    expect(screen.getByText("x")).toHaveClass("bg-gold-soft", "text-gold");
  });
});
