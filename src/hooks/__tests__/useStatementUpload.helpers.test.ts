import { describe, expect, it } from "vitest";
import { applyEvent, fileReadError } from "@/hooks/useStatementUpload.helpers";
import type { UploadFileState } from "@/types";

const baseFile: UploadFileState = {
  id: "abc",
  fileName: "fatura.pdf",
  sizeBytes: 2048,
  status: { kind: "pending" },
};

describe("applyEvent", () => {
  it("transitions to parsing on a PROGRESS event", () => {
    const next = applyEvent(baseFile, {
      type: "PROGRESS",
      requestId: "abc",
      phase: "extracting",
      pct: 25,
    });

    expect(next.status).toEqual({ kind: "parsing", phase: "extracting", pct: 25 });
  });

  it("transitions to success on a RESULT event", () => {
    const result = {
      bank: "nubank" as const,
      fileName: "fatura.pdf",
      transactions: [],
      detectedPeriod: { start: "2026-04-01", end: "2026-04-30" },
      warnings: [],
      checksum: 100,
      layoutFingerprint: "abcd1234",
      layerUsed: "bank-specific" as const,
    };

    const next = applyEvent(baseFile, { type: "RESULT", requestId: "abc", result });

    expect(next.status).toEqual({ kind: "success", result });
  });

  it("transitions to error on an ERROR event", () => {
    const error = {
      code: "ALL_LAYERS_FAILED" as const,
      message: "Não conseguimos.",
      fileName: "fatura.pdf",
    };

    const next = applyEvent(baseFile, { type: "ERROR", requestId: "abc", error });

    expect(next.status).toEqual({ kind: "error", error });
  });

  it("preserves identity fields when transitioning status", () => {
    const next = applyEvent(baseFile, {
      type: "PROGRESS",
      requestId: "abc",
      phase: "parsing",
      pct: 50,
    });

    expect(next.id).toBe("abc");
    expect(next.fileName).toBe("fatura.pdf");
    expect(next.sizeBytes).toBe(2048);
  });
});

describe("fileReadError", () => {
  it("builds a PARSER_THREW error with pt-BR message and the supplied detail", () => {
    const error = fileReadError("fatura.pdf", "FileReader threw");

    expect(error).toEqual({
      code: "PARSER_THREW",
      message: "Não conseguimos ler este arquivo. Tente outro PDF ou use entrada manual.",
      detail: "FileReader threw",
      fileName: "fatura.pdf",
    });
  });
});
