/** Shared date/amount parsing for CSV parsers. Exported to avoid circular imports. */

export function normalizeDate(raw: string): string {
  const value = String(raw).trim();

  if (value.includes("-") || value.includes("/")) {
    const parts = value.split(/[-/]/).map((p) => p.trim());
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (a.length === 4) return toIsoDate(a, b, c);
      if (c.length === 4) return toIsoDate(c, b, a);
      if (c.length === 2) return toIsoDate(`20${c}`, b, a);
    }
  }

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
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return "";
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  return `${year}-${month}-${day}`;
}

export function parseAmount(raw: string): number {
  const value = String(raw).trim().replace(/[R$\s]/gi, "");
  if (!value) return 0;

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
