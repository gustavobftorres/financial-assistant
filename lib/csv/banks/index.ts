import type { BankId, BankParser } from "./types";
import { bancoInterParser } from "./banco-inter";
import { genericParser } from "./generic";
import { nubankParser } from "./nubank";

export { SUPPORTED_BANKS } from "./types";
export type { BankId, BankParser } from "./types";

const parsers: Record<BankId, BankParser> = {
  nubank: nubankParser,
  banco_inter: bancoInterParser,
  generic: genericParser,
};

export function getBankParser(bankId: BankId): BankParser {
  const parser = parsers[bankId];
  if (!parser) return genericParser;
  return parser;
}
