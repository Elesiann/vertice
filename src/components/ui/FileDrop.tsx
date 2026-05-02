import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type JSX,
  type KeyboardEvent,
} from "react";

interface FileDropProps {
  onFilesAdded: (files: readonly File[]) => void;
  accept?: string;
  label?: string;
  hint?: string;
}

const isPdfFile = (file: File): boolean =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

export const FileDrop = ({
  onFilesAdded,
  accept = "application/pdf,.pdf",
  label = "Arraste PDFs aqui ou clique para escolher",
  hint = "Apenas .pdf",
}: FileDropProps): JSX.Element => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    (files: FileList | readonly File[]) => {
      const accepted = Array.from(files).filter(isPdfFile);
      if (accepted.length > 0) onFilesAdded(accepted);
    },
    [onFilesAdded],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      submit(e.dataTransfer.files);
    },
    [submit],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) submit(files);
      e.target.value = "";
    },
    [submit],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isDragging ? "border-accent bg-accent/5" : "border-ink-subtle hover:border-accent"}`}
    >
      <p className="text-center text-ink-muted">{label}</p>
      <p className="mt-2 text-sm text-ink-subtle">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        className="sr-only"
        aria-label={label}
      />
    </div>
  );
};
