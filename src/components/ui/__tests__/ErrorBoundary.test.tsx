import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const Boom = (): never => {
  throw new Error("kaboom");
};

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <p>conteúdo</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("renders the default pt-BR fallback when a child throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Algo deu errado.")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("renders a custom fallback when provided", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary fallback={<span>custom</span>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("custom")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
