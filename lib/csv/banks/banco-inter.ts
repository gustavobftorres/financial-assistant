import Papa from "papaparse";
import type { BankParser } from "./types";
import type { ParsedTransactionRow } from "../parser";
import { normalizeDate } from "../parse-utils";

/**
 * Banco Inter uses tab as decimal separator in amounts.
 * e.g. "820\t74" = 820.74, "1.012\t24" = 1012.24
 */
function parseAmountBancoInter(raw: string): number {
  let value = String(raw).trim().replace(/[R$\s]/gi, "");
  if (!value) return 0;

  // Tab acts as decimal separator: "820\t74" -> "820,74"
  value = value.replace(/\t/g, ",");

  const hasComma = value.includes(",");
  const hasDot = value.includes(".");
  let normalized = value;

  if (hasComma && hasDot) {
    if (value.lastIndexOf(",") > value.lastIndexOf(".")) {
      normalized = value.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = value.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = value.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const bancoInterParser: BankParser = {
  id: "banco_inter",
  name: "Banco Inter",
  parse(csvText: string): ParsedTransactionRow[] {
    const lines = csvText.split(/\r?\n/);
    const headerLineIndex = lines.findIndex((line) =>
      line.includes("Data Lançamento")
    );
    if (headerLineIndex < 0) {
      return [];
    }
    const dataStart = lines.slice(headerLineIndex).join("\n");

    const parsed = Papa.parse<Record<string, string>>(dataStart, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
    });

    const rows: ParsedTransactionRow[] = [];
    const headers = parsed.meta.fields ?? [];
    const dateCol =
      headers.find(
        (h) =>
          h.toLowerCase().includes("data") || h.toLowerCase().includes("lançamento")
      ) ?? headers[0];
    const historicoCol =
      headers.find((h) => h.toLowerCase().includes("histórico")) ?? headers[1];
    const descCol =
      headers.find((h) => h.toLowerCase().includes("descri")) ?? headers[2];
    const valueCol =
      headers.find(
        (h) =>
          h.toLowerCase().includes("valor") && !h.toLowerCase().includes("saldo")
      ) ?? headers[3];

    for (const row of parsed.data) {
      const dateRaw = row[dateCol] ?? row[headers[0]];
      const historicoRaw = row[historicoCol] ?? "";
      const descRaw = row[descCol] ?? "";
      const valueRaw = row[valueCol] ?? row[headers[3]];

      if (!dateRaw || valueRaw === undefined) continue;

      const date = normalizeDate(dateRaw);
      const historico = String(historicoRaw).trim();
      const desc = String(descRaw).trim();
      const description =
        historico && desc ? `${historico} - ${desc}` : desc || historico || "Sem descrição";
      const amount = parseAmountBancoInter(valueRaw);

      if (date && !isNaN(amount)) {
        rows.push({ date, description, amount });
      }
    }
    return rows;
  },
};
