import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId },
  });
});

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1 minute between AI calls per user

export const rateLimitedProcedure = authedProcedure.use(({ ctx, next }) => {
  const now = Date.now();
  const last = rateLimitMap.get(ctx.userId) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Aguarde um momento antes de tentar novamente.",
    });
  }
  rateLimitMap.set(ctx.userId, now);
  return next({ ctx });
});
