import { z } from "zod";
import { router, authedProcedure } from "../init";

export const profileRouter = router({
  get: authedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("profiles")
      .select("*")
      .eq("id", ctx.userId)
      .single();
    return data;
  }),

  upsert: authedProcedure
    .input(
      z.object({
        monthly_income: z.number().positive(),
        monthly_savings_goal: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("profiles").upsert(
        {
          id: ctx.userId,
          monthly_income: input.monthly_income,
          monthly_savings_goal: input.monthly_savings_goal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
