import { parseStatement } from "@/lib/parser";
import { extractText } from "@/lib/parsers/pdf-text";
import type { ParseError } from "@/types";
import type { WorkerEvent } from "@/workers/protocol";

export interface ParseRequest {
  requestId: string;
  fileName: string;
  bytes: ArrayBuffer;
}

export type Emit = (event: WorkerEvent) => void;

const toParseError = (err: unknown, fileName: string): ParseError => ({
  code: "PARSER_THREW",
  message: "Erro inesperado ao processar o PDF. Tente novamente ou use entrada manual.",
  detail: err instanceof Error ? err.message : String(err),
  fileName,
});

export const handleParseRequest = async (req: ParseRequest, emit: Emit): Promise<void> => {
  emit({ type: "PROGRESS", requestId: req.requestId, phase: "extracting", pct: 10 });
  try {
    const extracted = await extractText(req.bytes);
    emit({ type: "PROGRESS", requestId: req.requestId, phase: "detecting", pct: 40 });

    const result = parseStatement({
      rawText: extracted.rawText,
      fileName: req.fileName,
      items: extracted.items,
    });

    emit({ type: "PROGRESS", requestId: req.requestId, phase: "categorizing", pct: 90 });

    if (result.ok) {
      emit({ type: "RESULT", requestId: req.requestId, result: result.value });
    } else {
      emit({ type: "ERROR", requestId: req.requestId, error: result.error });
    }
  } catch (err) {
    emit({
      type: "ERROR",
      requestId: req.requestId,
      error: toParseError(err, req.fileName),
    });
  }
};
