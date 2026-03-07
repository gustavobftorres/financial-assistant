import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export interface UserContext {
  monthly_income: number;
  monthly_savings_goal: number;
  spending_patterns: {
    category: string;
    avg_monthly: number;
    trend: "up" | "down" | "stable";
  }[];
  last_month_summary: {
    total_spent: number;
    total_income: number;
    top_3_categories: string[];
    savings_achieved: number;
  };
  recent_transactions: {
    date: string;
    description: string;
    amount: number;
    category: string;
  }[];
}

async function buildUserContext(
  userId: string,
  supabase: SupabaseClient
): Promise<UserContext> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("monthly_income, monthly_savings_goal")
    .eq("id", userId)
    .single();

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = lastMonth.toISOString().split("T")[0];
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split("T")[0];

  const { data: lastMonthTxs } = await supabase
    .from("transactions")
    .select("amount, category")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);

  const totalSpent =
    (lastMonthTxs ?? [])
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0) ?? 0;
  const totalIncome =
    (lastMonthTxs ?? [])
      .filter((t) => t.amount > 0)
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0;

  const byCategory: Record<string, number> = {};
  for (const t of lastMonthTxs ?? []) {
    if (t.amount < 0) {
      const cat = t.category || "Other";
      byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(Number(t.amount));
    }
  }
  const top3 = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const { data: recent } = await supabase
    .from("transactions")
    .select("date, description, amount, category")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(20);

  return {
    monthly_income: Number(profile?.monthly_income) ?? 0,
    monthly_savings_goal: Number(profile?.monthly_savings_goal) ?? 0,
    spending_patterns: Object.entries(byCategory).map(([category, total]) => ({
      category,
      avg_monthly: total,
      trend: "stable" as const,
    })),
    last_month_summary: {
      total_spent: totalSpent,
      total_income: totalIncome,
      top_3_categories: top3,
      savings_achieved: totalIncome - totalSpent,
    },
    recent_transactions: (recent ?? []).map((t) => ({
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      category: t.category ?? "Other",
    })),
  };
}

export async function generateInsights(
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  const ctx = await buildUserContext(userId, supabase);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are a personal finance assistant. Be direct, concise, and data-driven.
User monthly income: R$ ${ctx.monthly_income}
User savings goal: R$ ${ctx.monthly_savings_goal}/month
Always respond in Brazilian Portuguese. Use specific numbers.
Suggest realistic, specific spending cuts based on actual patterns.`;

  const userPrompt = `
Last month summary:
- Total spent: R$ ${ctx.last_month_summary.total_spent}
- Top categories: ${ctx.last_month_summary.top_3_categories.join(", ")}
- Savings achieved: R$ ${ctx.last_month_summary.savings_achieved}

Monthly spending averages:
${ctx.spending_patterns.map((p) => `- ${p.category}: R$ ${p.avg_monthly} (${p.trend})`).join("\n")}

Generate exactly 3 practical insights and 1 specific cut suggestion to reach the savings goal.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content ?? "Não foi possível gerar insights.";
}

export async function chatWithAgent(
  userId: string,
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  supabase: SupabaseClient
): Promise<string> {
  const ctx = await buildUserContext(userId, supabase);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are a personal finance assistant. Be direct, concise, and data-driven.
User monthly income: R$ ${ctx.monthly_income}
User savings goal: R$ ${ctx.monthly_savings_goal}/month
Always respond in Brazilian Portuguese. Use specific numbers.
Use the user's spending context to give personalized advice.`;

  const contextBlock = `
User context (do not repeat to user):
- Last month spent: R$ ${ctx.last_month_summary.total_spent}, income: R$ ${ctx.last_month_summary.total_income}
- Top categories: ${ctx.last_month_summary.top_3_categories.join(", ")}
- Recent transactions: ${ctx.recent_transactions.slice(0, 5).map((t) => `${t.description}: R$ ${t.amount}`).join("; ")}
`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt + contextBlock },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    messages,
  });

  return response.choices[0]?.message?.content ?? "Desculpe, não consegui processar.";
}
