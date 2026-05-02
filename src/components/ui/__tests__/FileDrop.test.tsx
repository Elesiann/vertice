import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileDrop } from "@/components/ui/FileDrop";

const makePdf = (name: string): File =>
  new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: "application/pdf" });

describe("FileDrop", () => {
  it("renders the default label and hint", () => {
    render(<FileDrop onFilesAdded={vi.fn()} />);

    expect(screen.getByText("Arraste PDFs aqui ou clique para escolher")).toBeInTheDocument();
    expect(screen.getByText("Apenas .pdf")).toBeInTheDocument();
  });

  it("submits PDF files when selected via the file input", async () => {
    const onFilesAdded = vi.fn();
    render(<FileDrop onFilesAdded={onFilesAdded} />);
    const input = screen.getByLabelText(/Arraste PDFs aqui/);

    const file = makePdf("fatura.pdf");
    await userEvent.upload(input, file);

    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it("filters out non-PDF files", async () => {
    const onFilesAdded = vi.fn();
    render(<FileDrop onFilesAdded={onFilesAdded} />);
    const input = screen.getByLabelText(/Arraste PDFs aqui/);

    const txt = new File(["hello"], "notes.txt", { type: "text/plain" });
    await userEvent.upload(input, txt);

    expect(onFilesAdded).not.toHaveBeenCalled();
  });

  it("opens the file picker on Enter or Space key", async () => {
    const onFilesAdded = vi.fn();
    render(<FileDrop onFilesAdded={onFilesAdded} />);
    const dropzone = screen.getByRole("button", { name: /Arraste PDFs/ });

    dropzone.focus();
    await userEvent.keyboard("{Enter}");

    expect(dropzone).toHaveFocus();
  });
});
