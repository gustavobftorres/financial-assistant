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
      .select("total_value, date, operation")
      .eq("user_id", ctx.userId)
      .order("date", { ascending: false });

    const total = (data ?? [])
      .filter((e) => e.operation !== "sell")
      .reduce((s, e) => s + (Number(e.total_value) ?? 0), 0);

    return { totalNetWorth: total };
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
});
