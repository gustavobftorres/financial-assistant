"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface InvestmentsUploaderProps {
  onUploadExcel: (base64Content: string, fileName: string) => Promise<void>;
  onUploadCsv?: (content: string, fileName: string) => Promise<void>;
  className?: string;
  compact?: boolean;
}

export function InvestmentsUploader({
  onUploadExcel,
  onUploadCsv,
  className,
  compact,
}: InvestmentsUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      const isExcel =
        file.name.endsWith(".xlsx") ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const isCsv =
        file.name.endsWith(".csv") ||
        ["text/csv", "application/csv", "text/plain"].includes(file.type);

      if (!isExcel && !isCsv) {
        setError("Arquivo deve ser Excel (.xlsx) ou CSV");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("Arquivo muito grande (máx. 5MB)");
        return;
      }

      setIsLoading(true);
      try {
        if (isExcel) {
          const buffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          await onUploadExcel(base64, file.name);
        } else if (onUploadCsv) {
          const content = await file.text();
          await onUploadCsv(content, file.name);
        } else {
          setError("Importação de CSV não configurada");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao importar");
      } finally {
        setIsLoading(false);
      }
    },
    [onUploadExcel, onUploadCsv]
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
        "rounded-lg border-2 border-dashed border-border transition-colors",
        compact
          ? "flex items-center gap-2 px-3 py-2"
          : "p-8 text-center",
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
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        onChange={handleChange}
        className="hidden"
        id="investments-upload"
        disabled={isLoading}
      />
      <label
        htmlFor="investments-upload"
        className={cn(
          "cursor-pointer flex items-center gap-2",
          !compact && "flex-col"
        )}
      >
        <Upload className={cn("text-muted-foreground", compact ? "h-4 w-4" : "h-10 w-10")} />
        <span className={compact ? "text-xs font-medium" : "text-sm font-medium"}>
          {isLoading
            ? "Importando..."
            : compact
              ? "Importar Excel"
              : "Arraste um arquivo Excel (.xlsx) ou CSV ou clique para selecionar"}
        </span>
        {!compact && (
          <span className="text-xs text-muted-foreground">
            Máximo 5MB. Formato B3: Extrato da Área do Investidor
          </span>
        )}
      </label>
      {error && (
        <p className={cn("text-destructive", compact ? "ml-2 text-xs" : "mt-2 text-sm")}>
          {error}
        </p>
      )}
    </div>
  );
}
