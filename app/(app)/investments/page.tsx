"use client";

import { trpc } from "@/lib/trpc/client";
import { CsvUploader } from "@/components/csv-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { LoadingCoin } from "@/components/loading-coin";

export default function InvestmentsPage() {
  const utils = trpc.useUtils();

  const { data: listData, isLoading } = trpc.investments.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: summary } = trpc.investments.summary.useQuery();
  const { data: linkStatus } = trpc.wallet.getLinkStatus.useQuery();
  const { data: walletBalances } = trpc.wallet.getBalances.useQuery();

  const importMutation = trpc.investments.import.useMutation({
    onSuccess: (result) => {
      utils.investments.list.invalidate();
      utils.investments.summary.invalidate();
      toast.success(`${result.inserted} registros importados`);
    },
    onError: (e) => toast.error(e.message),
  });

  const csvTotal = summary?.totalNetWorth ?? 0;
  const walletTotalBRL = walletBalances?.totalBRL ?? 0;
  const hasWallet = Array.isArray(linkStatus) && linkStatus.length > 0;
  const totalNetWorth = csvTotal + walletTotalBRL;

  const today = new Date().toISOString().slice(0, 10);
  const evolutionDataRaw =
    listData?.data
      .filter((i) => i.operation !== "sell")
      .reduce((acc, inv) => {
        const d = inv.date;
        const val = Number(inv.total_value) ?? 0;
        const existing = acc.find((e: { date: string; total: number }) => e.date === d);
        if (existing) existing.total += val;
        else acc.push({ date: d, total: val });
        return acc;
      }, [] as { date: string; total: number }[]) ?? [];
  if (hasWallet) {
    const existing = evolutionDataRaw.find(
      (e: { date: string; total: number }) => e.date === today
    );
    if (existing) existing.total += walletTotalBRL;
    else evolutionDataRaw.push({ date: today, total: walletTotalBRL });
  }
  const evolutionData = [...evolutionDataRaw].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Investimentos</h1>

      <CsvUploader
        type="investments"
        onUpload={async (content, fileName) => {
          await importMutation.mutateAsync({ csvContent: content, fileName });
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Patrimônio líquido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-positive">
            {formatCurrency(totalNetWorth)}
          </p>
          {hasWallet && (
            <p className="mt-1 text-sm text-muted-foreground">
              Inclui R$ {formatCurrency(walletTotalBRL)} da carteira Phantom
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do patrimônio</CardTitle>
          </CardHeader>
          <CardContent>
            {evolutionData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value ?? 0)),
                      "Total",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={{ fill: "#22C55E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                Importe um CSV ou conecte sua carteira Phantom para ver a evolução
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de investimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingCoin label="Carregando investimentos..." className="py-8" />
            ) : !listData?.data.length && !hasWallet ? (
              <p className="text-muted-foreground py-8 text-center">
                Nenhum investimento. Importe um CSV ou conecte sua carteira Phantom.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasWallet &&
                    (linkStatus ?? []).map((link) => {
                      const bal =
                        link.chain === "solana"
                          ? walletBalances?.solana
                          : link.chain === "ethereum"
                            ? walletBalances?.ethereum
                            : walletBalances?.bitcoin;
                      const brl = bal?.brl ?? 0;
                      const labels: Record<string, string> = {
                        solana: "SOL",
                        ethereum: "ETH",
                        bitcoin: "BTC",
                      };
                      return (
                        <TableRow key={link.chain}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(today)}
                          </TableCell>
                          <TableCell>
                            Carteira Phantom ({labels[link.chain] ?? link.chain})
                          </TableCell>
                          <TableCell>Crypto</TableCell>
                          <TableCell className="text-right text-positive">
                            {formatCurrency(brl)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {listData?.data.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(inv.date)}
                      </TableCell>
                      <TableCell>{inv.asset_name}</TableCell>
                      <TableCell>{inv.asset_type || "-"}</TableCell>
                      <TableCell className="text-right text-positive">
                        {formatCurrency(Number(inv.total_value) ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
