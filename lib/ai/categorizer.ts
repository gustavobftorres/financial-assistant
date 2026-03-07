import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const CATEGORIES = [
  "Food & Dining",
  "Restaurants",
  "Groceries",
  "Transportation",
  "Fuel",
  "Public Transit",
  "Entertainment",
  "Streaming",
  "Subscriptions",
  "Health",
  "Pharmacy",
  "Education",
  "Clothing",
  "Home",
  "Investments",
  "Other",
];

export async function categorizeBatch(
  transactionIds: string[],
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  if (transactionIds.length === 0) return;

  const { data: txs } = await supabase
    .from("transactions")
    .select("id, description, amount")
    .in("id", transactionIds)
    .eq("user_id", userId);

  if (!txs || txs.length === 0) return;

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
${CATEGORIES.join(", ")}

User context: ${userHistory || "No prior history"}

Transactions (JSON array with "description" and "amount"):
${JSON.stringify(txs.map((t) => ({ description: t.description, amount: t.amount })))}

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

  const categories = safeParseCategories(content);
  const validCategories = CATEGORIES;

  for (let i = 0; i < txs.length && i < categories.length; i++) {
    const cat = validCategories.includes(categories[i])
      ? categories[i]
      : "Other";
    await supabase
      .from("transactions")
      .update({ category: cat })
      .eq("id", txs[i].id)
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
