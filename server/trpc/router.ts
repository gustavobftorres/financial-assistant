import { router } from "./init";
import { profileRouter } from "./routers/profile";
import { transactionsRouter } from "./routers/transactions";
import { investmentsRouter } from "./routers/investments";
import { aiRouter } from "./routers/ai";
import { walletRouter } from "./routers/wallet";

export const appRouter = router({
  profile: profileRouter,
  transactions: transactionsRouter,
  investments: investmentsRouter,
  ai: aiRouter,
  wallet: walletRouter,
});

export type AppRouter = typeof appRouter;
