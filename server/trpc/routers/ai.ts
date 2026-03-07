import { z } from "zod";
import { router, rateLimitedProcedure } from "../init";

export const aiRouter = router({
  categorize: rateLimitedProcedure
    .input(
      z.object({
        transactionIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { categorizeBatch } = await import("@/lib/ai/categorizer");
      await categorizeBatch(input.transactionIds, ctx.userId, ctx.supabase);
      return { success: true };
    }),

  chat: rateLimitedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(4000),
        history: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chatWithAgent } = await import("@/lib/ai/agent");
      const response = await chatWithAgent(
        ctx.userId,
        input.message,
        input.history,
        ctx.supabase
      );
      return { response };
    }),

  insights: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const { generateInsights } = await import("@/lib/ai/agent");
    const response = await generateInsights(ctx.userId, ctx.supabase);
    return { response };
  }),
});
