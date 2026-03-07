"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["text/csv", "application/csv", "text/plain"];

interface CsvUploaderProps {
  onUpload: (content: string, fileName: string) => Promise<void>;
  type: "transactions" | "investments";
  className?: string;
}

export function CsvUploader({ onUpload, type, className }: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith(".csv")) {
        setError("Arquivo deve ser CSV");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("Arquivo muito grande (máx. 5MB)");
        return;
      }

      setIsLoading(true);
      try {
        const content = await file.text();
        await onUpload(content, file.name);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao importar");
      } finally {
        setIsLoading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors",
        isDragging && "border-primary/50 bg-primary/5",
        isLoading && "opacity-60 pointer-events-none",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleChange}
        className="hidden"
        id={`csv-upload-${type}`}
        disabled={isLoading}
      />
      <label
        htmlFor={`csv-upload-${type}`}
        className="cursor-pointer flex flex-col items-center gap-2"
      >
        <Upload className="h-10 w-10 text-muted-foreground" />
        <span className="text-sm font-medium">
          {isLoading
            ? "Importando..."
            : "Arraste um CSV ou clique para selecionar"}
        </span>
        <span className="text-xs text-muted-foreground">
          Máximo 5MB. Formato: Data, Descrição, Valor
        </span>
      </label>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
