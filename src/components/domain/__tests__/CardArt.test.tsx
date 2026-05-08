import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardArt } from "@/components/domain/CardArt";

describe("CardArt", () => {
  it("renders with tier label visible", () => {
    render(<CardArt brand="visa" tier="infinite" />);
    expect(screen.getByText(/infinite/i)).toBeInTheDocument();
  });

  it("renders without crashing for unknown brand", () => {
    render(<CardArt brand="unknown-brand" tier="gold" />);
    expect(screen.getByText(/gold/i)).toBeInTheDocument();
  });

  it("renders sm size", () => {
    const { container } = render(<CardArt brand="mastercard" tier="black" size="sm" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders lg size", () => {
    const { container } = render(<CardArt brand="amex" tier="platinum" size="lg" />);
    expect(container.firstChild).toBeTruthy();
  });
});
