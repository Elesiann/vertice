import type { ParseError, UploadFileState } from "@/types";
import type { WorkerEvent } from "@/workers/protocol";

export const applyEvent = (file: UploadFileState, event: WorkerEvent): UploadFileState => {
  switch (event.type) {
    case "PROGRESS":
      return {
        ...file,
        status: { kind: "parsing", phase: event.phase, pct: event.pct },
      };
    case "RESULT":
      return {
        ...file,
        status: { kind: "success", result: event.result },
      };
    case "ERROR":
      return {
        ...file,
        status: { kind: "error", error: event.error },
      };
  }
};

export const fileReadError = (fileName: string, detail: string): ParseError => ({
  code: "PARSER_THREW",
  message: "Não conseguimos ler este arquivo. Tente outro PDF ou use entrada manual.",
  detail,
  fileName,
});
