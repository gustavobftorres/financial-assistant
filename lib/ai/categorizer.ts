import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

const DEFAULT_CATEGORY_NAMES = DEFAULT_CATEGORIES.map((c) => c.name);

export async function categorizeBatch(
  transactionIds: string[],
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  if (transactionIds.length === 0) return;

  const { data: userCategories } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", userId)
    .order("sort_order");
  const categories =
    userCategories && userCategories.length > 0
      ? userCategories.map((c) => c.name)
      : DEFAULT_CATEGORY_NAMES;

  const { data: txs } = await supabase
    .from("transactions")
    .select("id, description, amount")
    .in("id", transactionIds)
    .eq("user_id", userId);

  if (!txs || txs.length === 0) return;

  const incomes = txs.filter((t) => Number(t.amount) > 0);
  const expenses = txs.filter((t) => Number(t.amount) <= 0);

  for (const tx of incomes) {
    await supabase
      .from("transactions")
      .update({ category: "Incomes" })
      .eq("id", tx.id)
      .eq("user_id", userId);
  }

  if (expenses.length === 0) return;

  const { data: historic } = await supabase
    .from("transactions")
    .select("description, amount, category")
    .eq("user_id", userId)
    .not("category", "is", null)
    .limit(50);

  const userHistory = (historic ?? [])
    .map((h) => `${h.description} (${h.amount}) -> ${h.category}`)
    .join("; ");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `You are a financial transaction classifier. Classify each transaction into one of these categories:
${categories.join(", ")}

User context: ${userHistory || "No prior history"}

Transactions (JSON array with "description" and "amount"):
${JSON.stringify(expenses.map((t) => ({ description: t.description, amount: t.amount })))}

Respond ONLY with a JSON array of category strings in the same order as the input.
Example: ["Restaurants", "Subscriptions", "Groceries"]`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return;

  const parsed = safeParseCategories(content);

  const fallbackCat = categories.includes("Other")
    ? "Other"
    : categories[0] ?? "Other";
  for (let i = 0; i < expenses.length && i < parsed.length; i++) {
    const cat = categories.includes(parsed[i]) ? parsed[i] : fallbackCat;
    await supabase
      .from("transactions")
      .update({ category: cat })
      .eq("id", expenses[i].id)
      .eq("user_id", userId);
  }
}

function safeParseCategories(content: string): string[] {
  try {
    return JSON.parse(content) as string[];
  } catch {
    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/, "")
      .trim();
    try {
      return JSON.parse(cleaned) as string[];
    } catch {
      return [];
    }
  }
}
