import { z } from "zod";
import { router, authedProcedure } from "../init";

export const investmentsRouter = router({
  list: authedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error, count } = await ctx.supabase
        .from("investments")
        .select("*", { count: "exact" })
        .eq("user_id", ctx.userId)
        .order("date", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0 };
    }),

  summary: authedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("investments")
      .select("total_value, date, operation, transaction_type")
      .eq("user_id", ctx.userId)
      .order("date", { ascending: true });

    const rows = data ?? [];

    const totalNetWorth = rows.reduce((s, e) => {
      const v = Number(e.total_value) ?? 0;
      if (e.operation === "buy") return s + v;
      if (e.operation === "sell") return s - v;
      if (e.operation === "dividend") return s + v;
      return s;
    }, 0);

    const evolutionEvents = rows
      .filter(
        (e) =>
          e.operation === "buy" ||
          e.operation === "sell" ||
          e.operation === "dividend"
      )
      .map((e) => {
        let delta = 0;
        if (e.operation === "buy") delta = Number(e.total_value) ?? 0;
        else if (e.operation === "sell") delta = -(Number(e.total_value) ?? 0);
        else if (e.operation === "dividend") delta = Number(e.total_value) ?? 0;
        return { date: e.date, delta };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const evolutionByDate: Record<string, number> = {};
    let running = 0;
    for (const ev of evolutionEvents) {
      running += ev.delta;
      evolutionByDate[ev.date] = running;
    }
    const evolutionData = Object.entries(evolutionByDate)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const netFlowsByMonth: Record<string, number> = {};
    for (const e of rows) {
      if (e.operation !== "buy" && e.operation !== "sell") continue;
      const month = String(e.date).slice(0, 7);
      const v = Number(e.total_value) ?? 0;
      const flow = e.operation === "buy" ? v : -v;
      netFlowsByMonth[month] = (netFlowsByMonth[month] ?? 0) + flow;
    }

    const dividendsByMonth: Record<string, number> = {};
    const dividendsByType: Record<string, number> = {};
    for (const e of rows) {
      if (e.operation !== "dividend") continue;
      const month = String(e.date).slice(0, 7);
      const type = String(e.transaction_type ?? "Dividendo").trim() || "Dividendo";
      dividendsByMonth[month] = (dividendsByMonth[month] ?? 0) + (Number(e.total_value) ?? 0);
      dividendsByType[type] = (dividendsByType[type] ?? 0) + (Number(e.total_value) ?? 0);
    }
    const dividendsData = Object.entries(dividendsByMonth)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
    const dividendsByTypeData = Object.entries(dividendsByType)
      .map(([type, total]) => ({ type, total }))
      .sort((a, b) => b.total - a.total);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const investedThisMonth = rows
      .filter((e) => e.operation === "buy" && String(e.date).startsWith(currentMonth))
      .reduce((s, e) => s + (Number(e.total_value) ?? 0), 0);

    return {
      totalNetWorth,
      evolutionData,
      netFlowsByMonth,
      dividendsByMonth: dividendsData,
      dividendsByType: dividendsByTypeData,
      investedThisMonth,
    };
  }),

  portfolioHoldings: authedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("investments")
      .select("asset_name, asset_type, quantity, unit_price, total_value, operation")
      .eq("user_id", ctx.userId)
      .order("date", { ascending: true });

    const byAsset = new Map<
      string,
      { asset_name: string; asset_type: string; quantity: number; totalValue: number }
    >();

    for (const e of data ?? []) {
      const key = `${e.asset_name}|${e.asset_type ?? ""}`;
      const qty = Number(e.quantity) ?? 0;
      const val = Number(e.total_value) ?? 0;

      let cur = byAsset.get(key);
      if (!cur) {
        cur = { asset_name: e.asset_name, asset_type: e.asset_type ?? "acao", quantity: 0, totalValue: 0 };
        byAsset.set(key, cur);
      }

      if (e.operation === "buy") {
        cur.quantity += qty;
        cur.totalValue += val;
      } else if (e.operation === "sell") {
        cur.quantity -= qty;
        cur.totalValue -= val;
      }
    }

    return Array.from(byAsset.values())
      .filter((h) => h.quantity > 0)
      .sort((a, b) => b.totalValue - a.totalValue);
  }),

  getCDI: authedProcedure.query(async () => {
    const { getCDIAccumulatedMonth } = await import("@/lib/cdi");
    const accumulatedMonth = await getCDIAccumulatedMonth();
    return { accumulatedMonth };
  }),

  getCDIHistory: authedProcedure.query(async () => {
    const { getCDIMonthlyHistory } = await import("@/lib/cdi");
    return getCDIMonthlyHistory(24);
  }),

  import: authedProcedure
    .input(
      z.object({
        csvContent: z.string().max(5_000_000),
        fileName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { importInvestments } = await import("@/lib/csv/deduplicator");
      const result = await importInvestments(
        input.csvContent,
        input.fileName,
        ctx.userId,
        ctx.supabase
      );
      return result;
    }),

  importFromExcel: authedProcedure
    .input(
      z.object({
        base64Content: z.string().max(10_000_000),
        fileName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { importInvestmentsFromExcel } = await import("@/lib/csv/deduplicator");
      const result = await importInvestmentsFromExcel(
        input.base64Content,
        input.fileName,
        ctx.userId,
        ctx.supabase
      );
      return result;
    }),
});
