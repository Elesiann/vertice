import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractText } from "@/lib/parsers/pdf-text";

const buildSyntheticPdf = async (lines: readonly string[]): Promise<ArrayBuffer> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 600]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let cursorY = 560;
  for (const line of lines) {
    page.drawText(line, { x: 50, y: cursorY, size: 12, font });
    cursorY -= 20;
  }
  const bytes = await pdf.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

describe("extractText", () => {
  it("extracts text from a single-page synthetic PDF", async () => {
    const bytes = await buildSyntheticPdf(["Hello stackr", "Linha dois"]);

    const result = await extractText(bytes);

    expect(result.pageCount).toBe(1);
    expect(result.rawText).toContain("Hello stackr");
    expect(result.rawText).toContain("Linha dois");
  });

  it("returns text items with x/y positions and page numbers", async () => {
    const bytes = await buildSyntheticPdf(["Linha um", "Linha dois"]);

    const result = await extractText(bytes);

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toMatchObject({
      page: 1,
      x: expect.any(Number) as number,
      y: expect.any(Number) as number,
    });
    const first = result.items[0];
    const second = result.items[result.items.length - 1];
    expect(first?.y).toBeGreaterThan(second?.y ?? 0);
  });

  it("handles multi-page PDFs", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage([400, 600]).drawText("Page 1", { x: 50, y: 500, size: 12, font });
    pdf.addPage([400, 600]).drawText("Page 2", { x: 50, y: 500, size: 12, font });
    const bytes = await pdf.save();
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    const result = await extractText(buffer);

    expect(result.pageCount).toBe(2);
    expect(result.items.some((item) => item.page === 1)).toBe(true);
    expect(result.items.some((item) => item.page === 2)).toBe(true);
  });
});
