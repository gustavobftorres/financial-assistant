import { z } from "zod";
import { router, authedProcedure } from "../init";

export const transactionsRouter = router({
  list: authedProcedure
    .input(
      z.object({
        month: z.string().optional(),
        category: z.string().optional(),
        type: z.enum(["income", "expense", "all"]).optional(),
        limit: z.number().min(1).max(1000).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("user_id", ctx.userId)
        .order("date", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.month) {
        const [year, month] = input.month.split("-").map(Number);
        const start = new Date(year, month - 1, 1).toISOString().split("T")[0];
        const end = new Date(year, month, 0).toISOString().split("T")[0];
        query = query.gte("date", start).lte("date", end);
      }
      if (input.category) {
        query = query.eq("category", input.category);
      }
      if (input.type === "income") {
        query = query.gt("amount", 0);
      } else if (input.type === "expense") {
        query = query.lt("amount", 0);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0 };
    }),

  summary: authedProcedure
    .input(
      z.object({
        month: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const month = input.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [year, monthNum] = month.split("-").map(Number);
      const start = new Date(year, monthNum - 1, 1).toISOString().split("T")[0];
      const end = new Date(year, monthNum, 0).toISOString().split("T")[0];

      const { data, error } = await ctx.supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", ctx.userId)
        .gte("date", start)
        .lte("date", end);

      if (error) throw new Error(error.message);

      const totalIncome = (data ?? [])
        .filter((t) => t.amount > 0)
        .reduce((s, t) => s + Number(t.amount), 0);
      const totalExpense = (data ?? [])
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

      return {
        totalIncome,
        totalExpense,
        projectedBalance: totalIncome - totalExpense,
      };
    }),

  avgByCategory: authedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const EXCLUDED = new Set(["Invoice Payment", "Incomes"]);
      const now = new Date();
      const monthlyTotals: Record<string, number[]> = {};

      for (let i = 0; i < input.months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];

        const { data } = await ctx.supabase
          .from("transactions")
          .select("category, amount")
          .eq("user_id", ctx.userId)
          .gte("date", start)
          .lte("date", end)
          .lt("amount", 0);

        const monthMap: Record<string, number> = {};
        for (const row of data ?? []) {
          const cat = row.category || "Other";
          if (EXCLUDED.has(cat)) continue;
          monthMap[cat] = (monthMap[cat] ?? 0) + Math.abs(Number(row.amount));
        }
        for (const [cat, total] of Object.entries(monthMap)) {
          if (!monthlyTotals[cat]) monthlyTotals[cat] = [];
          monthlyTotals[cat].push(total);
        }
      }

      return Object.entries(monthlyTotals)
        .map(([category, totals]) => ({
          category,
          avg:
            totals.reduce((a, b) => a + b, 0) /
            (totals.length > 0 ? totals.length : 1),
        }))
        .sort((a, b) => b.avg - a.avg);
    }),

  savingsStreak: authedProcedure.query(async ({ ctx }) => {
    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select("monthly_savings_goal, best_savings_streak")
      .eq("id", ctx.userId)
      .single();

    const goal = Number(profile?.monthly_savings_goal ?? 0);
    const storedBest = Number(profile?.best_savings_streak ?? 0);

    if (goal <= 0) {
      return { currentStreak: 0, bestStreak: storedBest };
    }

    const now = new Date();
    const monthlySavings: { month: string; savings: number }[] = [];

    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const { data } = await ctx.supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", ctx.userId)
        .gte("date", start)
        .lte("date", end);

      const totalIncome = (data ?? [])
        .filter((t) => t.amount > 0)
        .reduce((s, t) => s + Number(t.amount), 0);
      const totalExpense = (data ?? [])
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      const savings = totalIncome - totalExpense;

      monthlySavings.push({ month, savings });
    }

    monthlySavings.reverse();

    let currentStreak = 0;
    for (let i = monthlySavings.length - 1; i >= 0; i--) {
      if (i === monthlySavings.length - 1) continue;
      const { savings } = monthlySavings[i];
      if (savings >= goal) {
        currentStreak++;
      } else {
        break;
      }
    }

    let bestComputed = 0;
    let run = 0;
    for (const { savings } of monthlySavings) {
      if (savings >= goal) {
        run++;
        bestComputed = Math.max(bestComputed, run);
      } else {
        run = 0;
      }
    }

    const bestStreak = Math.max(storedBest, bestComputed);

    if (bestComputed > storedBest) {
      await ctx.supabase
        .from("profiles")
        .update({
          best_savings_streak: bestStreak,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ctx.userId);
    }

    return { currentStreak, bestStreak };
  }),

  monthlyEvolution: authedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(12).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const results: { month: string; total: number }[] = [];

      for (let i = 0; i < input.months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

        const { data } = await ctx.supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", ctx.userId)
          .gte("date", start)
          .lte("date", end);

        const total = (data ?? [])
          .filter((t) => t.amount < 0)
          .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

        results.push({ month, total });
      }

      return results.reverse();
    }),

  updateCategory: authedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        category: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("transactions")
        .update({ category: input.category })
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  import: authedProcedure
    .input(
      z.object({
        csvContent: z.string().min(1).max(5_000_000),
        fileName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.fileName.toLowerCase().endsWith(".csv")) {
        throw new Error("Arquivo inválido. Envie um CSV.");
      }
      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("bank")
        .eq("id", ctx.userId)
        .single();
      const bankId = (profile?.bank as "nubank" | "banco_inter" | "generic") ?? "generic";
      const { importTransactions } = await import("@/lib/csv/deduplicator");
      const result = await importTransactions(
        input.csvContent,
        input.fileName,
        ctx.userId,
        ctx.supabase,
        bankId
      );
      return result;
    }),
});
