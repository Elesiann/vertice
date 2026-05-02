import type { JSX } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UploadFileState } from "@/types";

interface ParseStatusRowProps {
  file: UploadFileState;
  onRemove: (id: string) => void;
}

const formatKb = (bytes: number): string => `${(bytes / 1024).toFixed(0)} KB`;

const detailLine = (file: UploadFileState): string | null => {
  switch (file.status.kind) {
    case "success": {
      const r = file.status.result;
      const txCount = r.transactions.length;
      return `${r.bank} · ${String(txCount)} transações · ${r.detectedPeriod.start} a ${r.detectedPeriod.end}`;
    }
    case "error":
      return file.status.error.message;
    case "parsing":
    case "pending":
      return null;
  }
};

export const ParseStatusRow = ({ file, onRemove }: ParseStatusRowProps): JSX.Element => {
  const detail = detailLine(file);
  return (
    <li className="flex flex-col gap-2 rounded-md border border-ink-subtle/30 p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex-1">
        <p className="font-medium text-ink">{file.fileName}</p>
        <p className="text-sm text-ink-subtle">{formatKb(file.sizeBytes)}</p>
        {detail !== null && <p className="mt-1 text-sm text-ink-muted">{detail}</p>}
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <StatusPill status={file.status} />
        <Button
          variant="ghost"
          ariaLabel={`Remover ${file.fileName}`}
          onClick={() => {
            onRemove(file.id);
          }}
        >
          Remover
        </Button>
      </div>
    </li>
  );
};
