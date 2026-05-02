import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import { ParseStatusRow } from "@/components/domain/ParseStatusRow";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { useSession } from "@/context/SessionContext";
import { useStatementUpload } from "@/hooks/useStatementUpload";
import { ROUTES } from "@/routes";

export const UploadFlow = (): JSX.Element => {
  const { files } = useSession();
  const { addFiles, removeFile } = useStatementUpload();
  const navigate = useNavigate();

  const successCount = files.filter((f) => f.status.kind === "success").length;
  const canContinue = successCount > 0;

  const handleContinue = (): void => {
    void navigate(ROUTES.REVIEW);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Suba suas faturas</h1>
        <p className="mt-1 text-ink-muted">
          PDFs do Nubank por enquanto. Tudo é processado no seu navegador — nada vai pra nenhum
          servidor.
        </p>
      </header>

      <FileDrop onFilesAdded={addFiles} />

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <ParseStatusRow key={file.id} file={file} onRemove={removeFile} />
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Button onClick={handleContinue} disabled={!canContinue}>
          Continuar para a análise
        </Button>
      </div>
    </div>
  );
};
