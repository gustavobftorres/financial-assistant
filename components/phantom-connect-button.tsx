"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function PhantomIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="currentColor"
      className={cn("size-5 shrink-0", className)}
      aria-hidden
    >
      <path d="M64 16C37.5 16 16 37.5 16 64c0 12.4 4.7 23.7 12.4 32.2v.1c.1.1.2.2.3.3 1.2 1.3 2.5 2.5 3.9 3.6 2.2 1.8 4.6 3.4 7.1 4.8 4.9 2.7 10.2 4.5 15.8 5.4 1.1.2 2.2.3 3.3.4h.2c.1 0 .2 0 .3.1h.2c.1 0 .2 0 .3-.1h.2c1.1-.1 2.2-.2 3.3-.4 5.6-.9 10.9-2.7 15.8-5.4 2.5-1.4 4.9-3 7.1-4.8 1.4-1.1 2.7-2.3 3.9-3.6.1-.1.2-.2.3-.3v-.1C107.3 87.7 112 76.4 112 64c0-26.5-21.5-48-48-48zM52 64c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm24 0c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-12 24c-6.6 0-12-5.4-12-12s5.4-12 12-12 12 5.4 12 12-5.4 12-12 12z" />
    </svg>
  );
}

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function PhantomConnectButton({ className }: { className?: string }) {
  const utils = trpc.useUtils();
  const { data: linkStatus, isLoading: linkLoading } =
    trpc.wallet.getLinkStatus.useQuery();
  const linkMutation = trpc.wallet.linkWallet.useMutation({
    onSuccess: () => {
      utils.wallet.getLinkStatus.invalidate();
      utils.wallet.getBalances.invalidate();
      toast.success("Carteira Phantom vinculada com sucesso");
    },
    onError: (e) => toast.error(e.message),
  });
  const unlinkMutation = trpc.wallet.unlinkPhantom.useMutation({
    onSuccess: () => {
      utils.wallet.getLinkStatus.invalidate();
      utils.wallet.getBalances.invalidate();
      toast.success("Carteira Phantom desvinculada");
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleConnect() {
    const phantom = typeof window !== "undefined" ? window.phantom : null;
    if (!phantom?.solana) {
      toast.error("Phantom não encontrado. Instale a extensão Phantom.");
      return;
    }
    try {
      const chains: Array<{ chain: "solana" | "ethereum" | "bitcoin"; getAddress: () => Promise<string> }> = [
        {
          chain: "solana",
          getAddress: async () => {
            const { publicKey } = await phantom.solana!.connect();
            return publicKey.toString();
          },
        },
      ];
      if (phantom.ethereum) {
        chains.push({
          chain: "ethereum",
          getAddress: async () => {
            const accounts = (await phantom.ethereum!.request({
              method: "eth_requestAccounts",
              params: [],
            })) as string[];
            return accounts[0] ?? "";
          },
        });
      }
      if (phantom.bitcoin) {
        chains.push({
          chain: "bitcoin",
          getAddress: async () => {
            const btc = phantom.bitcoin as {
              requestAccounts?: () => Promise<Array<{ address: string; purpose?: string }>>;
              request?: (args: { method: string }) => Promise<Array<{ address: string; purpose?: string }>>;
            };
            const accounts =
              (await btc.requestAccounts?.()) ??
              (await btc.request?.({ method: "requestAccounts" })) ??
              [];
            const payment = accounts.find((a) => a.purpose === "payment") ?? accounts[0];
            return payment?.address ?? "";
          },
        });
      }
      for (const { chain, getAddress } of chains) {
        try {
          const address = await getAddress();
          if (address) {
            await linkMutation.mutateAsync({ chain, walletAddress: address });
          }
        } catch (chainErr) {
          if ((chainErr as { code?: number }).code === 4001) {
            toast.error("Conexão cancelada");
            return;
          }
        }
      }
    } catch (err) {
      if ((err as { code?: number }).code === 4001) {
        toast.error("Conexão cancelada");
      } else {
        toast.error((err as Error).message);
      }
    }
  }

  if (linkLoading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("gap-2", className)}
        disabled
      >
        <Loader2 data-icon="inline-start" className="size-4 animate-spin" aria-hidden />
        Carregando...
      </Button>
    );
  }

  if (Array.isArray(linkStatus) && linkStatus.length > 0) {
    const primary = linkStatus.find((l) => l.chain === "solana") ?? linkStatus[0];
    const chainLabels = linkStatus.map((l) => l.chain).join(", ");
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="font-mono text-xs text-muted-foreground" title={chainLabels}>
          {truncateAddress(primary.wallet_address)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => unlinkMutation.mutate()}
          disabled={unlinkMutation.isPending}
          className="gap-1.5 bg-[#AB9FF2]/15 text-[#AB9FF2] hover:bg-[#AB9FF2]/25 hover:text-[#AB9FF2]"
        >
          {unlinkMutation.isPending ? (
            <Loader2 data-icon="inline-start" className="size-4 animate-spin" aria-hidden />
          ) : (
            <PhantomIcon />
          )}
          Desvincular
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleConnect}
      disabled={linkMutation.isPending}
      className={cn(
        "gap-1.5 bg-[#AB9FF2] text-white hover:bg-[#9B8FE2] hover:text-white",
        className
      )}
    >
      {linkMutation.isPending ? (
        <Loader2 data-icon="inline-start" className="size-4 animate-spin" aria-hidden />
      ) : (
        <PhantomIcon />
      )}
      Conectar Phantom
    </Button>
  );
}
