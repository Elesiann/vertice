/// <reference lib="WebWorker" />

import { handleParseRequest } from "@/workers/parse-handler";
import type { WorkerEvent, WorkerRequest } from "@/workers/protocol";

const emit = (event: WorkerEvent): void => {
  self.postMessage(event);
};

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (req.type !== "PARSE") return;
  void handleParseRequest(req, emit);
});
