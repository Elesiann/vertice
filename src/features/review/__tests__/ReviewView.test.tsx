import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { ReviewView } from "@/features/review/ReviewView";
import type { UploadFileState } from "@/types";

const SeedSession = ({ files }: { files: readonly UploadFileState[] }): null => {
  const { setFiles } = useSession();
  useEffect(() => {
    setFiles([...files]);
  }, [files, setFiles]);
  return null;
};

const renderWithSession = (files: readonly UploadFileState[]): void => {
  render(
    <MemoryRouter>
      <SessionProvider>
        <SeedSession files={files} />
        <ReviewView />
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("ReviewView", () => {
  it("shows the empty state when no transactions are present", () => {
    render(
      <MemoryRouter>
        <SessionProvider>
          <ReviewView />
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Nenhuma transação ainda")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir para upload/ })).toBeInTheDocument();
  });

  it("renders TotalsCard when at least one file parsed successfully", async () => {
    const file: UploadFileState = {
      id: "f1",
      fileName: "fatura.pdf",
      sizeBytes: 1024,
      status: {
        kind: "success",
        result: {
          bank: "nubank",
          fileName: "fatura.pdf",
          transactions: [
            {
              id: "t1",
              date: "2026-04-15",
              description: "Loja",
              amountBrl: 150,
              category: "domestic",
              sourceFile: "fatura.pdf",
              bank: "nubank",
            },
          ],
          detectedPeriod: { start: "2026-04-01", end: "2026-04-30" },
          warnings: [],
          checksum: 150,
          layoutFingerprint: "abc",
          layerUsed: "bank-specific",
        },
      },
    };

    renderWithSession([file]);

    expect(await screen.findByText("Análise")).toBeInTheDocument();
    expect(screen.getByLabelText("Resumo de gastos")).toBeInTheDocument();
  });
});
