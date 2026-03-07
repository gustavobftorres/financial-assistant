import type { SupabaseClient } from "@supabase/supabase-js";
import { parseBankCSV } from "./parser";

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isDuplicate(
  row: { date: string; description: string; amount: number },
  existing: { date: string; description: string; amount: number }[]
): boolean {
  return existing.some(
    (e) =>
      e.date === row.date &&
      e.description === row.description &&
      Number(e.amount) === row.amount
  );
}

export async function importTransactions(
  csvContent: string,
  _fileName: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{ inserted: number; duplicates: number }> {
  const hash = await sha256(csvContent);

  const { data: existingImport } = await supabase
    .from("csv_imports")
    .select("id")
    .eq("user_id", userId)
    .eq("file_hash", hash)
    .maybeSingle();

  if (existingImport) {
    throw new Error("CSV já importado anteriormente");
  }

  const rows = parseBankCSV(csvContent);

  const { data: existingTxs } = await supabase
    .from("transactions")
    .select("date, description, amount")
    .eq("user_id", userId);

  const newRows = rows.filter(
    (row) => !isDuplicate(row, existingTxs ?? [])
  );
  const duplicates = rows.length - newRows.length;

  const { data: importLog, error: importError } = await supabase
    .from("csv_imports")
    .insert({
      user_id: userId,
      file_hash: hash,
      import_type: "transactions",
      rows_inserted: newRows.length,
    })
    .select()
    .single();

  if (importError) throw new Error(importError.message);

  let insertedIds: string[] = [];
  if (newRows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert(
        newRows.map((r) => ({
          user_id: userId,
          date: r.date,
          description: r.description,
          amount: r.amount,
          raw_description: r.description,
          source_import_id: importLog.id,
        }))
      )
      .select("id")
      .returns<{ id: string }[]>();

    if (insertError) throw new Error(insertError.message);
    insertedIds = (inserted ?? []).map((r) => r.id);
  }

  if (insertedIds.length > 0 && process.env.OPENAI_API_KEY) {
    try {
      const { categorizeBatch } = await import("@/lib/ai/categorizer");
      await categorizeBatch(insertedIds, userId, supabase);
    } catch {
      // Non-blocking: categorization can be retried manually
    }
  }

  return { inserted: newRows.length, duplicates };
}

export async function importInvestments(
  csvContent: string,
  _fileName: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{ inserted: number; duplicates: number }> {
  const hash = await sha256(csvContent);

  const { data: existingImport } = await supabase
    .from("csv_imports")
    .select("id")
    .eq("user_id", userId)
    .eq("file_hash", hash)
    .maybeSingle();

  if (existingImport) {
    throw new Error("CSV já importado anteriormente");
  }

  const { parseInvestmentCSV } = await import("./parser");
  const rows = parseInvestmentCSV(csvContent);

  const { data: importLog, error: importError } = await supabase
    .from("csv_imports")
    .insert({
      user_id: userId,
      file_hash: hash,
      import_type: "investments",
      rows_inserted: rows.length,
    })
    .select()
    .single();

  if (importError) throw new Error(importError.message);

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("investments").insert(
      rows.map((r) => ({
        user_id: userId,
        date: r.date,
        asset_name: r.asset_name,
        asset_type: r.asset_type,
        quantity: r.quantity,
        unit_price: r.unit_price,
        total_value: r.total_value,
        operation: r.operation,
        source_import_id: importLog.id,
      }))
    );
    if (insertError) throw new Error(insertError.message);
  }

  return { inserted: rows.length, duplicates: 0 };
}
