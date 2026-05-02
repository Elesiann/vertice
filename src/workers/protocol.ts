import type { ParseError, ParseProgressPhase, ParserResult } from "@/types";

export type WorkerRequest =
  | { type: "PARSE"; requestId: string; fileName: string; bytes: ArrayBuffer }
  | { type: "CANCEL"; requestId: string };

export type WorkerEvent =
  | {
      type: "PROGRESS";
      requestId: string;
      phase: ParseProgressPhase;
      pct: number;
    }
  | { type: "RESULT"; requestId: string; result: ParserResult }
  | { type: "ERROR"; requestId: string; error: ParseError };
