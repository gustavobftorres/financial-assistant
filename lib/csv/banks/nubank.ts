import Papa from "papaparse";
import type { BankParser } from "./types";
import type { ParsedTransactionRow } from "../parser";
import { normalizeDate, parseAmount } from "../parse-utils";

export const nubankParser: BankParser = {
  id: "nubank",
  name: "Nubank",
  parse(csvText: string): ParsedTransactionRow[] {
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const rows: ParsedTransactionRow[] = [];
    const headers = parsed.meta.fields ?? [];
    const dateCol =
      headers.find(
        (h) =>
          h.toLowerCase().includes("data") || h.toLowerCase().includes("date")
      ) ?? headers[0];
    const descCol =
      headers.find(
        (h) =>
          h.toLowerCase().includes("descri") ||
          h.toLowerCase().includes("description")
      ) ?? headers[1];
    const valueCol =
      headers.find(
        (h) =>
          h.toLowerCase().includes("valor") ||
          h.toLowerCase().includes("amount") ||
          h.toLowerCase().includes("value")
      ) ?? headers[2];

    for (const row of parsed.data) {
      const dateRaw = row[dateCol] ?? row[headers[0]];
      const descRaw = row[descCol] ?? row[headers[1]];
      const valueRaw = row[valueCol] ?? row[headers[2]];

      if (!dateRaw || !descRaw || valueRaw === undefined) continue;

      const date = normalizeDate(dateRaw);
      const description = String(descRaw).trim();
      const amount = parseAmount(valueRaw);

      if (date && !isNaN(amount)) {
        rows.push({ date, description, amount });
      }
    }
    return rows;
  },
};
