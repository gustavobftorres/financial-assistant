import { z } from "zod";
import { router, authedProcedure } from "../init";

export const budgetRouter = router({
  getCategoryBudgets: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("category_budgets")
      .select("id, category, monthly_limit")
      .eq("user_id", ctx.userId)
      .order("category");
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  upsertCategoryBudget: authedProcedure
    .input(
      z.object({
        category: z.string().min(1),
        monthly_limit: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("category_budgets").upsert(
        {
          user_id: ctx.userId,
          category: input.category,
          monthly_limit: input.monthly_limit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,category" }
      );
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  deleteCategoryBudget: authedProcedure
    .input(z.object({ category: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("category_budgets")
        .delete()
        .eq("user_id", ctx.userId)
        .eq("category", input.category);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  getFixedCosts: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("fixed_costs")
      .select("id, name, total_amount, installments, start_month")
      .eq("user_id", ctx.userId)
      .order("start_month", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  upsertFixedCost: authedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        total_amount: z.number().min(0),
        installments: z.number().min(0),
        start_month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = {
        user_id: ctx.userId,
        name: input.name,
        total_amount: input.total_amount,
        installments: input.installments,
        start_month: input.start_month,
      };
      if (input.id) {
        const { error } = await ctx.supabase
          .from("fixed_costs")
          .update(row)
          .eq("id", input.id)
          .eq("user_id", ctx.userId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await ctx.supabase.from("fixed_costs").insert(row);
        if (error) throw new Error(error.message);
      }
      return { success: true };
    }),

  deleteFixedCost: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("fixed_costs")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
