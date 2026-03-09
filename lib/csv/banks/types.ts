import type { ParsedTransactionRow } from "../parser";

export interface BankParser {
  id: string;
  name: string;
  parse(csvText: string): ParsedTransactionRow[];
}

export const SUPPORTED_BANKS = [
  { id: "nubank", name: "Nubank" },
  { id: "banco_inter", name: "Banco Inter" },
  { id: "generic", name: "Outro (formato genérico)" },
] as const;

export type BankId = (typeof SUPPORTED_BANKS)[number]["id"];
