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
  transaction_type?: string;
}

function detectAssetType(productName: string): string {
  const name = String(productName).toUpperCase().trim();
  if (name.includes("TESOURO") || name.includes("CDB") || name.includes("DEBÊNTURE") || name.includes("DEBENTURE")) return "tesouro";
  if (name.includes("FII") || name.includes("CI ") || /[A-Z0-9]{2,6}11\s*$/.test(name)) return "fii";
  return "acao";
}

function normalizeForMatch(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "");
}

function parseOperationFromB3(
  movimentacao: string,
  entradaSaida: string
): "buy" | "sell" | "dividend" | "update" {
  const mov = normalizeForMatch(movimentacao);
  const es = normalizeForMatch(entradaSaida);

  if (
    mov.includes("dividendo") ||
    mov.includes("rendimento") ||
    (mov.includes("juros") && mov.includes("capital"))
  ) {
    return "dividend";
  }

  if (mov.includes("resgate")) return "sell";

  if (mov.includes("transfer") && mov.includes("liquid")) {
    return es.includes("entrad") || es.includes("cred") ? "buy" : "sell";
  }

  return "buy";
}

const DATE_PATTERN = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;

const MOVIMENTACAO_KEYWORDS = [
  "dividendo",
  "juros",
  "capital próprio",
  "capital proprio",
  "transferência",
  "transferencia",
  "liquidação",
  "liquidacao",
  "rentabilidade",
  "rendimento",
  "resgate",
  "atualização",
  "atualizacao",
  "amortização",
  "amortizacao",
  "subscrição",
  "subscricao",
  "bonificação",
  "bonificacao",
  "cessão",
  "cessao",
  "leilão",
  "leilao",
];

function looksLikeDate(val: string): boolean {
  return DATE_PATTERN.test(String(val).trim());
}

function looksLikeEntradaSaida(val: string): boolean {
  const v = normalizeForMatch(val);
  return v === "credito" || v === "debito" || v.includes("entrad") || v.includes("said");
}

function looksLikeMovimentacao(val: string): boolean {
  const v = normalizeForMatch(val);
  return MOVIMENTACAO_KEYWORDS.some((kw) => v.includes(kw));
}

function looksLikeProduct(val: string): boolean {
  const v = String(val).trim();
  if (!v || looksLikeDate(v) || looksLikeEntradaSaida(v)) return false;
  if (looksLikeMovimentacao(v)) return false;
  if (/^\d+([.,]\d+)*$/.test(v.replace(/[R$\s]/g, ""))) return false;
  return v.length >= 2 && v.length <= 80;
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

function detectB3Columns(
  rawHeaders: string[],
  data: Record<string, string>[]
): {
  entradaSaida: number;
  data: number;
  movimentacao: number;
  produto: number;
  quantidade: number;
  preco: number;
  valor: number;
} {
  const sample = data.slice(0, Math.min(20, data.length));
  const colCount = rawHeaders.length;

  let entradaSaida = -1;
  let dataCol = -1;
  let movimentacaoCol = -1;
  let produto = -1;

  for (let c = 0; c < colCount; c++) {
    const key = rawHeaders[c];
    const values = sample.map((r) => String(r[key] ?? "").trim()).filter(Boolean);
    if (values.length === 0) continue;

    const headerNorm = String(rawHeaders[c]).toLowerCase().replace(/\uFEFF/g, "").replace(/[^\w\s/]/g, "");

    const allDates = values.every((v) => looksLikeDate(v));
    const allEntradaSaida = values.every((v) => looksLikeEntradaSaida(v));
    const allMovimentacao = values.every((v) => looksLikeMovimentacao(v));
    const allProducts = values.every((v) => looksLikeProduct(v));

    if (allEntradaSaida && entradaSaida < 0) entradaSaida = c;
    if (allDates && dataCol < 0) dataCol = c;
    if (allMovimentacao && movimentacaoCol < 0) movimentacaoCol = c;
    if (allProducts && produto < 0) produto = c;

    if (
      (headerNorm.includes("produto") || headerNorm.includes("ativo") || headerNorm.includes("prod")) &&
      produto < 0 &&
      !allMovimentacao
    ) {
      produto = c;
    }
  }

  if (produto < 0) {
    let bestCol = -1;
    let bestScore = 0;
    for (let c = 0; c < colCount; c++) {
      if (c === dataCol || c === entradaSaida || c === movimentacaoCol) continue;
      const key = rawHeaders[c];
      const values = sample.map((r) => String(r[key] ?? "").trim()).filter(Boolean);
      const productLike = values.filter((v) => looksLikeProduct(v)).length;
      const movLike = values.filter((v) => looksLikeMovimentacao(v)).length;
      const score = values.length > 0 ? (productLike - movLike) / values.length : 0;
      if (score > bestScore && score >= 0.2) {
        bestScore = score;
        bestCol = c;
      }
    }
    if (bestCol >= 0) produto = bestCol;
  }

  if (entradaSaida < 0) entradaSaida = 0;
  if (dataCol < 0) dataCol = 1;
  if (movimentacaoCol < 0) movimentacaoCol = 2;
  if (produto < 0) produto = 3;
  if (produto === movimentacaoCol && colCount > 3) {
    for (let c = 0; c < colCount; c++) {
      if (c !== dataCol && c !== entradaSaida && c !== movimentacaoCol) {
        const v = String(sample[0]?.[rawHeaders[c]] ?? "").trim();
        if (looksLikeProduct(v) && !looksLikeMovimentacao(v)) {
          produto = c;
          break;
        }
      }
    }
  }

  const used = new Set([entradaSaida, dataCol, produto, movimentacaoCol]);
  const movimentacao = movimentacaoCol;
  let quantidade = 5;
  if (!used.has(5)) quantidade = 5;
  else for (let i = 0; i < colCount; i++) if (!used.has(i)) { quantidade = i; break; }

  used.add(quantidade);
  let preco = 6;
  if (!used.has(6)) preco = 6;
  else for (let i = 0; i < colCount; i++) if (!used.has(i)) { preco = i; break; }

  used.add(preco);
  let valor = 7;
  if (!used.has(7)) valor = 7;
  else for (let i = 0; i < colCount; i++) if (!used.has(i)) { valor = i; break; }

  return {
    entradaSaida,
    data: dataCol,
    movimentacao,
    produto,
    quantidade,
    preco,
    valor,
  };
}

export function parseInvestmentCSV(csvText: string): ParsedInvestmentRow[] {
  let parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if ((parsed.meta.fields ?? []).length < 6 && csvText.includes(";")) {
    parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
    });
  }

  const rows: ParsedInvestmentRow[] = [];
  const rawHeaders = parsed.meta.fields ?? [];
  const dataRows = parsed.data as Record<string, string>[];

  if (isB3Format(rawHeaders) && dataRows.length > 0) {
    const cols = detectB3Columns(rawHeaders, dataRows);

    for (const row of dataRows) {
      const dateRaw = row[rawHeaders[cols.data]];
      const esRaw = row[rawHeaders[cols.entradaSaida]] ?? "";
      const movRaw = row[rawHeaders[cols.movimentacao]] ?? "";
      const assetRaw = row[rawHeaders[cols.produto]];
      const qtyRaw = row[rawHeaders[cols.quantidade]];
      const priceRaw = row[rawHeaders[cols.preco]];
      const valueRaw = row[rawHeaders[cols.valor]];

      if (!dateRaw || !assetRaw) continue;

      const date = normalizeDate(dateRaw);
      if (!date) continue;

      if (looksLikeDate(String(assetRaw).trim())) continue;

      const operation = parseOperationFromB3(movRaw, esRaw);
      const amount = parseAmount(valueRaw ?? priceRaw ?? "0");
      const qty = parseFloat(String(qtyRaw).replace(",", ".")) || 0;
      const price = parseAmount(priceRaw ?? "0") || (qty ? amount / qty : 0);

      rows.push({
        date,
        asset_name: String(assetRaw).trim(),
        asset_type: detectAssetType(assetRaw),
        quantity: qty,
        unit_price: price,
        total_value: amount || qty * price,
        operation,
        transaction_type: String(movRaw).trim() || undefined,
      });
    }
  } else {
    for (const row of parsed.data) {
      const dateRaw = row["Data"] ?? row["date"] ?? row[rawHeaders[0]];
      const assetRaw = row["Ativo"] ?? row["asset_name"] ?? row[rawHeaders[1]];
      const typeRaw = row["Tipo"] ?? row["asset_type"] ?? row[rawHeaders[2]];
      const qtyRaw = row["Quantidade"] ?? row["quantity"] ?? row[rawHeaders[3]];
      const priceRaw = row["Preço"] ?? row["unit_price"] ?? row[rawHeaders[4]];
      const valueRaw = row["Valor"] ?? row["total_value"] ?? row[rawHeaders[5]];
      const opRaw = row["Operação"] ?? row["operation"] ?? "buy";

      if (!dateRaw || !assetRaw) continue;

      const date = normalizeDate(dateRaw);
      if (!date) continue;

      const operation = ["sell", "dividend", "update"].includes(
        String(opRaw).toLowerCase()
      )
        ? (String(opRaw).toLowerCase() as "sell" | "dividend" | "update")
        : "buy";

      const amount = parseAmount(valueRaw ?? priceRaw ?? "0");
      const qty = parseFloat(String(qtyRaw).replace(",", ".")) || 0;
      const price = parseAmount(priceRaw ?? "0") || (qty ? amount / qty : 0);

      rows.push({
        date,
        asset_name: String(assetRaw).trim(),
        asset_type: String(typeRaw || "acao").trim(),
        quantity: qty,
        unit_price: price,
        total_value: amount || qty * price,
        operation,
      });
    }
  }

  return rows;
}

export function parseInvestmentRowsFromTable(
  rawHeaders: string[],
  dataRows: Record<string, unknown>[],
  isB3: boolean
): ParsedInvestmentRow[] {
  const rows: ParsedInvestmentRow[] = [];
  const toStr = (v: unknown) => (v != null ? String(v).trim() : "");

  if (isB3 && dataRows.length > 0) {
    const strRows = dataRows.map((r) => {
      const out: Record<string, string> = {};
      for (const h of rawHeaders) out[h] = toStr(r[h]);
      return out;
    });
    const cols = detectB3Columns(rawHeaders, strRows);

    for (const row of dataRows) {
      const dateRaw = toStr(row[rawHeaders[cols.data]]);
      const esRaw = toStr(row[rawHeaders[cols.entradaSaida]]);
      const movRaw = toStr(row[rawHeaders[cols.movimentacao]]);
      const assetRaw = toStr(row[rawHeaders[cols.produto]]);
      const qtyRaw = toStr(row[rawHeaders[cols.quantidade]]);
      const priceRaw = toStr(row[rawHeaders[cols.preco]]);
      const valueRaw = toStr(row[rawHeaders[cols.valor]]);

      if (!dateRaw || !assetRaw) continue;

      const date = normalizeDate(dateRaw);
      if (!date) continue;

      if (looksLikeDate(assetRaw)) continue;

      const operation = parseOperationFromB3(movRaw, esRaw);
      const amount = parseAmount(valueRaw || priceRaw || "0");
      const qty = parseFloat(qtyRaw.replace(",", ".")) || 0;
      const price = parseAmount(priceRaw || "0") || (qty ? amount / qty : 0);

      rows.push({
        date,
        asset_name: assetRaw,
        asset_type: detectAssetType(assetRaw),
        quantity: qty,
        unit_price: price,
        total_value: amount || qty * price,
        operation,
        transaction_type: movRaw || undefined,
      });
    }
  } else {
    for (const row of dataRows) {
      const dateRaw = toStr(row["Data"] ?? row["date"] ?? row[rawHeaders[0]]);
      const assetRaw = toStr(row["Ativo"] ?? row["asset_name"] ?? row[rawHeaders[1]]);
      const typeRaw = toStr(row["Tipo"] ?? row["asset_type"] ?? row[rawHeaders[2]]);
      const qtyRaw = toStr(row["Quantidade"] ?? row["quantity"] ?? row[rawHeaders[3]]);
      const priceRaw = toStr(row["Preço"] ?? row["unit_price"] ?? row[rawHeaders[4]]);
      const valueRaw = toStr(row["Valor"] ?? row["total_value"] ?? row[rawHeaders[5]]);
      const opRaw = toStr(row["Operação"] ?? row["operation"] ?? "buy");

      if (!dateRaw || !assetRaw) continue;

      const date = normalizeDate(dateRaw);
      if (!date) continue;

      const operation = ["sell", "dividend", "update"].includes(opRaw.toLowerCase())
        ? (opRaw.toLowerCase() as "sell" | "dividend" | "update")
        : "buy";

      const amount = parseAmount(valueRaw || priceRaw || "0");
      const qty = parseFloat(qtyRaw.replace(",", ".")) || 0;
      const price = parseAmount(priceRaw || "0") || (qty ? amount / qty : 0);

      rows.push({
        date,
        asset_name: assetRaw,
        asset_type: typeRaw || "acao",
        quantity: qty,
        unit_price: price,
        total_value: amount || qty * price,
        operation,
      });
    }
  }

  return rows;
}
