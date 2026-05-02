import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParseStatusRow } from "@/components/domain/ParseStatusRow";
import type { UploadFileState } from "@/types";

const baseFile: UploadFileState = {
  id: "f1",
  fileName: "fatura.pdf",
  sizeBytes: 4096,
  status: { kind: "pending" },
};

describe("ParseStatusRow", () => {
  it("shows file name and size for a pending row", () => {
    render(<ParseStatusRow file={baseFile} onRemove={vi.fn()} />);

    expect(screen.getByText("fatura.pdf")).toBeInTheDocument();
    expect(screen.getByText("4 KB")).toBeInTheDocument();
  });

  it("shows the bank, transaction count, and period on success", () => {
    const file: UploadFileState = {
      ...baseFile,
      status: {
        kind: "success",
        result: {
          bank: "nubank",
          fileName: "fatura.pdf",
          transactions: [
            {
              id: "t1",
              date: "2026-04-15",
              description: "X",
              amountBrl: 100,
              category: "domestic",
              sourceFile: "fatura.pdf",
              bank: "nubank",
            },
          ],
          detectedPeriod: { start: "2026-04-01", end: "2026-04-30" },
          warnings: [],
          checksum: 100,
          layoutFingerprint: "abc",
          layerUsed: "bank-specific",
        },
      },
    };
    render(<ParseStatusRow file={file} onRemove={vi.fn()} />);

    expect(screen.getByText(/nubank · 1 transações/)).toBeInTheDocument();
  });

  it("shows the error message on failure", () => {
    const file: UploadFileState = {
      ...baseFile,
      status: {
        kind: "error",
        error: {
          code: "ALL_LAYERS_FAILED",
          message: "Não conseguimos ler.",
          fileName: "fatura.pdf",
        },
      },
    };
    render(<ParseStatusRow file={file} onRemove={vi.fn()} />);

    expect(screen.getByText("Não conseguimos ler.")).toBeInTheDocument();
  });

  it("calls onRemove with the file id when the remove button is clicked", async () => {
    const onRemove = vi.fn();
    render(<ParseStatusRow file={baseFile} onRemove={onRemove} />);

    await userEvent.click(screen.getByRole("button", { name: /Remover/ }));

    expect(onRemove).toHaveBeenCalledWith("f1");
  });
});
