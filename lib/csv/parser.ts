import Papa from "papaparse";

export interface ParsedTransactionRow {
  date: string;
  description: string;
  amount: number;
}

export function parseBankCSV(csvText: string): ParsedTransactionRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: ParsedTransactionRow[] = [];
  const headers = parsed.meta.fields ?? [];
  const dateCol = headers.find(
    (h) =>
      h.toLowerCase().includes("data") ||
      h.toLowerCase().includes("date")
  ) ?? headers[0];
  const descCol = headers.find(
    (h) =>
      h.toLowerCase().includes("descri") ||
      h.toLowerCase().includes("description")
  ) ?? headers[1];
  const valueCol = headers.find(
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
}

function normalizeDate(raw: string): string {
  const value = String(raw).trim();

  // Prefer explicit separated formats first.
  if (value.includes("-") || value.includes("/")) {
    const parts = value.split(/[-/]/).map((p) => p.trim());
    if (parts.length === 3) {
      const [a, b, c] = parts;

      // yyyy-mm-dd
      if (a.length === 4) {
        return toIsoDate(a, b, c);
      }

      // dd/mm/yyyy (common in pt-BR bank exports)
      if (c.length === 4) {
        return toIsoDate(c, b, a);
      }

      // dd/mm/yy fallback
      if (c.length === 2) {
        return toIsoDate(`20${c}`, b, a);
      }
    }
  }

  // Numeric-only fallback: yyyymmdd or ddmmyyyy
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 8) {
    if (cleaned.startsWith("19") || cleaned.startsWith("20")) {
      return toIsoDate(
        cleaned.slice(0, 4),
        cleaned.slice(4, 6),
        cleaned.slice(6, 8)
      );
    }
    return toIsoDate(
      cleaned.slice(4, 8),
      cleaned.slice(2, 4),
      cleaned.slice(0, 2)
    );
  }

  return "";
}

function toIsoDate(yearRaw: string, monthRaw: string, dayRaw: string): string {
  const year = yearRaw.padStart(4, "0");
  const month = monthRaw.padStart(2, "0");
  const day = dayRaw.padStart(2, "0");

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return "";
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return "";
  }
  return `${year}-${month}-${day}`;
}

function parseAmount(raw: string): number {
  const value = String(raw).trim().replace(/[R$\s]/gi, "");
  if (!value) return 0;

  const hasComma = value.includes(",");
  const hasDot = value.includes(".");
  let normalized = value;

  if (hasComma && hasDot) {
    // Use last separator as decimal separator.
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

export interface ParsedInvestmentRow {
  date: string;
  asset_name: string;
  asset_type: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  operation: "buy" | "sell" | "dividend" | "update";
}

export function parseInvestmentCSV(csvText: string): ParsedInvestmentRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: ParsedInvestmentRow[] = [];
  const headers = parsed.meta.fields ?? [];

  for (const row of parsed.data) {
    const dateRaw = row["Data"] ?? row["date"] ?? row[headers[0]];
    const assetRaw = row["Ativo"] ?? row["asset_name"] ?? row[headers[1]];
    const typeRaw = row["Tipo"] ?? row["asset_type"] ?? row[headers[2]];
    const qtyRaw = row["Quantidade"] ?? row["quantity"] ?? row[headers[3]];
    const priceRaw = row["Preço"] ?? row["unit_price"] ?? row[headers[4]];
    const valueRaw = row["Valor"] ?? row["total_value"] ?? row[headers[5]];
    const opRaw = row["Operação"] ?? row["operation"] ?? "buy";

    if (!dateRaw || !assetRaw) continue;

    const date = normalizeDate(dateRaw);
    const amount = parseAmount(valueRaw ?? priceRaw ?? "0");
    const qty = parseFloat(String(qtyRaw).replace(",", ".")) || 0;
    const price = parseAmount(priceRaw ?? "0") || (qty ? amount / qty : 0);

    rows.push({
      date,
      asset_name: String(assetRaw).trim(),
      asset_type: String(typeRaw || "Other").trim(),
      quantity: qty,
      unit_price: price,
      total_value: amount || qty * price,
      operation: ["sell", "dividend", "update"].includes(
        String(opRaw).toLowerCase()
      )
        ? (String(opRaw).toLowerCase() as "sell" | "dividend" | "update")
        : "buy",
    });
  }

  return rows;
}
