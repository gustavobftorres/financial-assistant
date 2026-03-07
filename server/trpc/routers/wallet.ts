import { z } from "zod";
import { Connection, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { router, authedProcedure } from "../init";

const LAMPORTS_PER_SOL = 1e9;
const SATOSHIS_PER_BTC = 1e8;
const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const ETHEREUM_RPC = process.env.ETHEREUM_RPC_URL ?? "https://eth.llamarpc.com";

function getWalletAddressFromUser(user: { identities?: Array<{ provider?: string; identity_data?: Record<string, unknown>; provider_id?: string }> }): string | null {
  const identity = user.identities?.find(
    (i) => i.provider === "web3" || i.provider === "solana"
  );
  if (!identity) return null;
  const addr =
    (identity.identity_data?.address as string) ??
    (identity.identity_data?.wallet_address as string) ??
    identity.provider_id;
  return typeof addr === "string" ? addr.trim().toLowerCase() : null;
}

export const walletRouter = router({
  getLinkStatus: authedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("wallet_links")
      .select("wallet_address, chain, created_at")
      .eq("user_id", ctx.userId);
    return data ?? [];
  }),

  linkWallet: authedProcedure
    .input(
      z.object({
        chain: z.enum(["solana", "ethereum", "bitcoin"]),
        walletAddress: z.string().min(26).max(90),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalized = input.walletAddress.trim();
      const { error } = await ctx.supabase.from("wallet_links").upsert(
        {
          user_id: ctx.userId,
          chain: input.chain,
          wallet_address: normalized,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,chain",
        }
      );
      if (error) {
        if (error.code === "23505") {
          throw new Error("Esta carteira já está vinculada a outra conta.");
        }
        throw new Error(error.message);
      }
      return { success: true };
    }),

  unlinkChain: authedProcedure
    .input(z.object({ chain: z.enum(["solana", "ethereum", "bitcoin"]) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("wallet_links")
        .delete()
        .eq("user_id", ctx.userId)
        .eq("chain", input.chain);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  unlinkPhantom: authedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from("wallet_links")
      .delete()
      .eq("user_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  }),

  getBalances: authedProcedure.query(async ({ ctx }) => {
    const { data: links } = await ctx.supabase
      .from("wallet_links")
      .select("chain, wallet_address")
      .eq("user_id", ctx.userId);
    if (!links?.length) return null;

    const result: {
      solana?: { balance: number; brl: number; address: string };
      ethereum?: { balance: number; brl: number; address: string };
      bitcoin?: { balance: number; brl: number; address: string };
      totalBRL: number;
    } = { totalBRL: 0 };

    const ids = ["solana", "ethereum", "bitcoin"].filter((id) =>
      links.some((l) => l.chain === id)
    );
    const pricesRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum,bitcoin&vs_currencies=brl`
    );
    const prices = (await pricesRes.json()) as Record<
      string,
      { brl?: number }
    >;

    for (const link of links) {
      try {
        if (link.chain === "solana") {
          const conn = new Connection(SOLANA_RPC);
          const pubkey = new PublicKey(link.wallet_address);
          const balance = await conn.getBalance(pubkey);
          const solBalance = balance / LAMPORTS_PER_SOL;
          const brl = (prices.solana?.brl ?? 0) * solBalance;
          result.solana = { balance: solBalance, brl, address: link.wallet_address };
          result.totalBRL += brl;
        } else if (link.chain === "ethereum") {
          const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC);
          const balance = await provider.getBalance(link.wallet_address);
          const ethBalance = Number(ethers.formatEther(balance));
          const brl = (prices.ethereum?.brl ?? 0) * ethBalance;
          result.ethereum = { balance: ethBalance, brl, address: link.wallet_address };
          result.totalBRL += brl;
        } else if (link.chain === "bitcoin") {
          const btcRes = await fetch(
            `https://blockchain.info/q/addressbalance/${link.wallet_address}?cors=true`
          );
          const satoshis = parseInt(await btcRes.text(), 10) || 0;
          const btcBalance = satoshis / SATOSHIS_PER_BTC;
          const brl = (prices.bitcoin?.brl ?? 0) * btcBalance;
          result.bitcoin = { balance: btcBalance, brl, address: link.wallet_address };
          result.totalBRL += brl;
        }
      } catch {
        // Skip failed chain
      }
    }

    return result;
  }),

  checkWalletLinked: authedProcedure.query(async ({ ctx }) => {
    const { data: { user } } = await ctx.supabase.auth.getUser();
    if (!user) return { linked: false, walletAddress: null };
    const walletAddress = getWalletAddressFromUser(user);
    if (!walletAddress) return { linked: false, walletAddress: null };
    const normalized = walletAddress.trim();
    const { data: linked } = await ctx.supabase.rpc("is_wallet_linked", {
      check_address: normalized,
    });
    return { linked: !!linked, walletAddress: normalized };
  }),
});
