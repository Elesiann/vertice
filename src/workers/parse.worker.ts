/// <reference lib="WebWorker" />

import { handleParseRequest } from "@/workers/parse-handler";
import type { WorkerEvent, WorkerRequest } from "@/workers/protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const emit = (event: WorkerEvent): void => {
  ctx.postMessage(event);
};

ctx.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (req.type !== "PARSE") return;
  void handleParseRequest(req, emit);
});
