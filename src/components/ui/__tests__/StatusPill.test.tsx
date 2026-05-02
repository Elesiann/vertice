import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/ui/StatusPill";

describe("StatusPill", () => {
  it("renders 'Aguardando' for pending status", () => {
    render(<StatusPill status={{ kind: "pending" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Aguardando");
  });

  it("renders the parsing percentage", () => {
    render(<StatusPill status={{ kind: "parsing", phase: "extracting", pct: 42 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Lendo 42%");
  });

  it("renders 'OK' on success", () => {
    render(
      <StatusPill
        status={{
          kind: "success",
          result: {
            bank: "nubank",
            fileName: "f.pdf",
            transactions: [],
            detectedPeriod: { start: "2026-04-01", end: "2026-04-30" },
            warnings: [],
            checksum: 0,
            layoutFingerprint: null,
            layerUsed: "bank-specific",
          },
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("OK");
  });

  it("renders 'Falhou' on error", () => {
    render(
      <StatusPill
        status={{
          kind: "error",
          error: { code: "ALL_LAYERS_FAILED", message: "x", fileName: "f.pdf" },
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Falhou");
  });
});
