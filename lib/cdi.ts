/**
 * CDI data fetcher.
 * Source: BCB (Banco Central) - series 4391 (monthly CDI)
 * https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados?formato=json
 *
 * Format: { "data": "01/MM/YYYY", "valor": "1.28" } — valor is monthly rate in %
 */

export interface CDIMonthlyRate {
  year: number;
  month: number;
  rate: number;
  date: string;
}

async function fetchFromBCB(): Promise<CDIMonthlyRate[]> {
  const res = await fetch(
    "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados?formato=json"
  );
  if (!res.ok) return [];

  const arr = (await res.json()) as { data: string; valor: string }[];
  if (!Array.isArray(arr) || arr.length === 0) return [];

  const rates: CDIMonthlyRate[] = [];
  for (const r of arr) {
    const d = String(r.data);
    const [, month, year] = d.split("/");
    const y = parseInt(year ?? "0", 10);
    const m = parseInt(month ?? "0", 10);
    if (!y || !m || y < 2000 || y > 2030) continue;

    const rate = parseFloat(String(r.valor).replace(",", ".")) || 0;
    const date = `${y}-${String(m).padStart(2, "0")}-01`;

    rates.push({ year: y, month: m, rate, date });
  }

  return rates.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCDIMonthlyHistory(
  monthsBack = 24
): Promise<CDIMonthlyRate[]> {
  const rates = await fetchFromBCB();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  const cutoffStr = cutoff.toISOString().slice(0, 7);

  return rates.filter((r) => r.date.slice(0, 7) >= cutoffStr);
}

export async function getCDIAccumulatedMonth(): Promise<number> {
  const history = await getCDIMonthlyHistory(2);
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const found = history.find((r) => r.date.startsWith(current));
  return found?.rate ?? 0;
}
