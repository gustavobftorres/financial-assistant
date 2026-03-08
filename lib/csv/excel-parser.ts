import * as XLSX from "xlsx";
import {
  parseInvestmentRowsFromTable,
  type ParsedInvestmentRow,
} from "./parser";

function excelDateToIso(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date && date.y >= 1900 && date.y <= 2100) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function isExcelSerialDate(n: number): boolean {
  return Number.isFinite(n) && n >= 1000 && n <= 500000;
}

function toDisplayString(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (isExcelSerialDate(value)) {
      return excelDateToIso(value);
    }
    return String(value).replace(".", ",");
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function isB3Format(headers: string[]): boolean {
  if (headers.length < 6) return false;
  const normalized = headers.map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/\uFEFF/g, "")
      .replace(/[^\w\s/]/g, "")
  );
  return (
    normalized.some((h) => h.includes("movimenta")) ||
    normalized.some((h) => h.includes("movimentacao"))
  );
}

export function parseInvestmentExcel(buffer: ArrayBuffer): ParsedInvestmentRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const json = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (json.length < 2) return [];

  const headerRow = json[0];
  const rawHeaders = headerRow.map((h) => toDisplayString(h));
  const dataRows: Record<string, unknown>[] = [];

  for (let i = 1; i < json.length; i++) {
    const row = json[i] as unknown[];
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      const key = rawHeaders[c];
      if (!key) continue;
      const val = row[c];
      obj[key] = typeof val === "number" && isExcelSerialDate(val)
        ? excelDateToIso(val)
        : toDisplayString(val);
    }
    const hasData = Object.values(obj).some((v) => v !== "" && v != null);
    if (hasData) dataRows.push(obj);
  }

  return parseInvestmentRowsFromTable(rawHeaders, dataRows, isB3Format(rawHeaders));
}
