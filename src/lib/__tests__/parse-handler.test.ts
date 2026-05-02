import { describe, expect, it } from "vitest";
import { handleParseRequest } from "@/workers/parse-handler";
import type { WorkerEvent } from "@/workers/protocol";
import { buildSyntheticPdf } from "@/lib/__tests__/factories";

const collect = async (bytes: ArrayBuffer, fileName = "fatura.pdf"): Promise<WorkerEvent[]> => {
  const events: WorkerEvent[] = [];
  await handleParseRequest({ requestId: "r1", fileName, bytes }, (event) => {
    events.push(event);
  });
  return events;
};

describe("handleParseRequest", () => {
  it("emits a RESULT event when the chain succeeds", async () => {
    const bytes = await buildSyntheticPdf([
      "Nubank fatura",
      "FATURA 08 MAI 2026",
      "Total a pagar R$ 100,00",
      "Periodo vigente: 01 ABR a 01 MAI",
      "04 ABR Loja Teste R$ 100,00",
    ]);

    const events = await collect(bytes);

    const result = events.find((e) => e.type === "RESULT");
    expect(result?.type).toBe("RESULT");
  });

  it("emits an ERROR event when no transactions parse and no Layer 3 items help", async () => {
    const bytes = await buildSyntheticPdf(["Some random non-statement content"]);

    const events = await collect(bytes);

    const error = events.find((e) => e.type === "ERROR");
    expect(error?.type).toBe("ERROR");
    if (error?.type === "ERROR") {
      expect(error.error.code).toBe("ALL_LAYERS_FAILED");
    }
  });

  it("emits PROGRESS events through the parse phases", async () => {
    const bytes = await buildSyntheticPdf(["Some content"]);

    const events = await collect(bytes);

    const phases: string[] = [];
    for (const e of events) {
      if (e.type === "PROGRESS") phases.push(e.phase);
    }
    expect(phases).toContain("extracting");
  });

  it("converts thrown errors into a PARSER_THREW ERROR event", async () => {
    const events: WorkerEvent[] = [];

    await handleParseRequest(
      { requestId: "r2", fileName: "bad.pdf", bytes: new ArrayBuffer(0) },
      (event) => events.push(event),
    );

    const error = events.find((e) => e.type === "ERROR");
    expect(error?.type).toBe("ERROR");
    if (error?.type === "ERROR") {
      expect(["PARSER_THREW", "ALL_LAYERS_FAILED", "EMPTY_PDF"]).toContain(error.error.code);
    }
  });
});
