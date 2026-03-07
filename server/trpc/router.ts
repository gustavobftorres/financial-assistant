import { router } from "./init";
import { profileRouter } from "./routers/profile";
import { transactionsRouter } from "./routers/transactions";
import { investmentsRouter } from "./routers/investments";
import { aiRouter } from "./routers/ai";

export const appRouter = router({
  profile: profileRouter,
  transactions: transactionsRouter,
  investments: investmentsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
