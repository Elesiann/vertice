import { useCallback, useEffect, useRef } from "react";
import { useSession } from "@/context/SessionContext";
import { applyEvent, fileReadError } from "@/hooks/useStatementUpload.helpers";
import type { UploadFileState } from "@/types";
import type { WorkerEvent, WorkerRequest } from "@/workers/protocol";

interface StatementUploadApi {
  addFiles: (files: readonly File[]) => void;
  removeFile: (id: string) => void;
}

const createWorker = (): Worker =>
  new Worker(new URL("../workers/parse.worker.ts", import.meta.url), { type: "module" });

export const useStatementUpload = (): StatementUploadApi => {
  const { setFiles } = useSession();
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = createWorker();
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<WorkerEvent>): void => {
      const data = event.data;
      setFiles((prev) =>
        prev.map((file) => (file.id === data.requestId ? applyEvent(file, data) : file)),
      );
    };

    worker.addEventListener("message", handleMessage);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [setFiles]);

  const addFiles = useCallback(
    (files: readonly File[]): void => {
      const worker = workerRef.current;
      if (!worker) return;

      for (const file of files) {
        const id = crypto.randomUUID();
        const initial: UploadFileState = {
          id,
          fileName: file.name,
          sizeBytes: file.size,
          status: { kind: "pending" },
        };
        setFiles((prev) => [...prev, initial]);

        void file
          .arrayBuffer()
          .then((bytes) => {
            const request: WorkerRequest = {
              type: "PARSE",
              requestId: id,
              fileName: file.name,
              bytes,
            };
            worker.postMessage(request, { transfer: [bytes] });
          })
          .catch((err: unknown) => {
            const detail = err instanceof Error ? err.message : String(err);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === id
                  ? { ...f, status: { kind: "error", error: fileReadError(file.name, detail) } }
                  : f,
              ),
            );
          });
      }
    },
    [setFiles],
  );

  const removeFile = useCallback(
    (id: string): void => {
      setFiles((prev) => prev.filter((f) => f.id !== id));
      workerRef.current?.postMessage({ type: "CANCEL", requestId: id } satisfies WorkerRequest);
    },
    [setFiles],
  );

  return { addFiles, removeFile };
};
