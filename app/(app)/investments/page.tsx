"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { InvestmentsUploader } from "@/components/investments-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
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
import { PortfolioDonut } from "@/components/charts/portfolio-donut";
import { DividendsBar } from "@/components/charts/dividends-bar";
import {
  PortfolioVsCDIChart,
  buildPerformanceData,
} from "@/components/charts/portfolio-vs-cdi-chart";

const PAGE_SIZE = 6;
const TAB_TYPES = ["acao", "fii", "tesouro", "outros"] as const;
const TAB_LABELS: Record<(typeof TAB_TYPES)[number], string> = {
  acao: "Ações",
  fii: "Fundos Imobiliários",
  tesouro: "Tesouro / Renda Fixa",
  outros: "Outros",
};

export default function InvestmentsPage() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] =
    useState<(typeof TAB_TYPES)[number]>("acao");

  const { data: summary, isLoading: summaryLoading } =
    trpc.investments.summary.useQuery();
  const { data: holdings, isLoading: holdingsLoading } =
    trpc.investments.portfolioHoldings.useQuery();
  const { data: cdi } = trpc.investments.getCDI.useQuery();
  const { data: cdiHistory } = trpc.investments.getCDIHistory.useQuery();
  const { data: linkStatus } = trpc.wallet.getLinkStatus.useQuery();
  const { data: walletBalances } = trpc.wallet.getBalances.useQuery();

  const importMutation = trpc.investments.import.useMutation({
    onSuccess: (result) => {
      utils.investments.list.invalidate();
      utils.investments.summary.invalidate();
      utils.investments.portfolioHoldings.invalidate();
      toast.success(`${result.inserted} registros importados`);
    },
    onError: (e) => toast.error(e.message),
  });

  const importExcelMutation = trpc.investments.importFromExcel.useMutation({
    onSuccess: (result) => {
      utils.investments.list.invalidate();
      utils.investments.summary.invalidate();
      utils.investments.portfolioHoldings.invalidate();
      toast.success(`${result.inserted} registros importados`);
    },
    onError: (e) => toast.error(e.message),
  });

  const csvTotal = summary?.totalNetWorth ?? 0;
  const walletTotalBRL = walletBalances?.totalBRL ?? 0;
  const hasWallet = Array.isArray(linkStatus) && linkStatus.length > 0;
  const totalNetWorth = csvTotal + walletTotalBRL;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const dividendsThisMonth = useMemo(() => {
    const d = summary?.dividendsByMonth?.find((x) => x.month === currentMonth);
    return d?.total ?? 0;
  }, [summary?.dividendsByMonth, currentMonth]);

  const investedThisMonth = summary?.investedThisMonth ?? 0;

  const evolutionData = useMemo(() => {
    const ev = summary?.evolutionData ?? [];
    let data = ev;
    if (ev.length === 0 && hasWallet && walletTotalBRL > 0) {
      const today = new Date().toISOString().slice(0, 10);
      data = [{ date: today, total: walletTotalBRL }];
    } else if (hasWallet && walletTotalBRL > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const last = ev[ev.length - 1];
      const lastTotal = last ? last.total : 0;
      data = [...ev, { date: today, total: lastTotal + walletTotalBRL }];
    }
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return data.filter((d) => d.date >= cutoffStr);
  }, [summary?.evolutionData, hasWallet, walletTotalBRL]);

  const filteredHoldings = useMemo(() => {
    const list = holdings ?? [];
    if (activeTab === "outros") {
      return list.filter(
        (h) =>
          !TAB_TYPES.slice(0, -1).includes(
            h.asset_type as (typeof TAB_TYPES)[number],
          ),
      );
    }
    return list.filter((h) => h.asset_type === activeTab);
  }, [holdings, activeTab]);

  const paginatedHoldings = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredHoldings.slice(start, start + PAGE_SIZE);
  }, [filteredHoldings, page]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredHoldings.length / PAGE_SIZE),
  );

  const performanceData = useMemo(() => {
    const hist = cdiHistory ?? [];
    return buildPerformanceData(
      evolutionData,
      hist.map((r) => ({ date: r.date, rate: r.rate })),
      summary?.netFlowsByMonth ?? {},
    );
  }, [evolutionData, cdiHistory, summary?.netFlowsByMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Investimentos</h1>
        <InvestmentsUploader
          compact
          onUploadExcel={async (base64, fileName) => {
            await importExcelMutation.mutateAsync({
              base64Content: base64,
              fileName,
            });
          }}
          onUploadCsv={async (content, fileName) => {
            await importMutation.mutateAsync({ csvContent: content, fileName });
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dividendos / Juros no mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-positive">
              {formatCurrency(dividendsThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CDI do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {cdi?.accumulatedMonth != null
                ? `${cdi.accumulatedMonth.toFixed(2)}%`
                : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total investido no mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(investedThisMonth)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do patrimônio</CardTitle>
            {hasWallet && (
              <p className="text-sm text-muted-foreground">
                Inclui {formatCurrency(walletTotalBRL)} da carteira Phantom
              </p>
            )}
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <LoadingCoin label="Carregando..." className="py-12" />
            ) : evolutionData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evolutionData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
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
                    stroke="hsl(var(--positive))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                Importe um CSV ou conecte sua carteira Phantom para ver a
                evolução
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição da carteira</CardTitle>
          </CardHeader>
          <CardContent>
            {holdingsLoading ? (
              <LoadingCoin label="Carregando..." className="py-12" />
            ) : (
              <PortfolioDonut
                holdings={holdings ?? []}
                cryptoTotal={hasWallet ? walletTotalBRL : 0}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance da carteira vs CDI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Rendimento percentual acumulado nos últimos 12 meses
          </p>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <LoadingCoin label="Carregando..." className="py-12" />
          ) : (
            <PortfolioVsCDIChart
              data={performanceData.data}
              rendimentoCarteira={performanceData.rendimentoCarteira}
              rendimentoCDI={performanceData.rendimentoCDI}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dividendos por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <DividendsBar data={summary?.dividendsByMonth ?? []} />
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Carteira</CardTitle>
          <p className="text-sm text-muted-foreground">
            Posições atuais (compras - vendas)
          </p>
        </CardHeader>
        <CardContent>
          {holdingsLoading ? (
            <LoadingCoin label="Carregando carteira..." className="py-8" />
          ) : (
            <div className="flex flex-col">
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as (typeof TAB_TYPES)[number]);
                  setPage(0);
                }}
                className="flex flex-col"
              >
                <TabsList className="mb-4 w-full grid grid-cols-4">
                  {TAB_TYPES.map((t) => (
                    <TabsTrigger key={t} value={t} className="flex-1">
                      {TAB_LABELS[t]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {TAB_TYPES.map((tab) => (
                  <TabsContent key={tab} value={tab}>
                    {filteredHoldings.length === 0 && tab === activeTab ? (
                      <p className="py-8 text-center text-muted-foreground">
                        Nenhuma posição em {TAB_LABELS[tab].toLowerCase()}
                      </p>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ativo</TableHead>
                              <TableHead className="text-right">
                                Quantidade
                              </TableHead>
                              <TableHead className="text-right">
                                Valor
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tab === activeTab &&
                              paginatedHoldings.map((h) => (
                                <TableRow
                                  key={`${h.asset_name}-${h.asset_type}`}
                                >
                                  <TableCell>{h.asset_name}</TableCell>
                                  <TableCell className="text-right">
                                    {h.quantity.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 4,
                                    })}
                                  </TableCell>
                                  <TableCell className="text-right text-positive">
                                    {formatCurrency(h.totalValue)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                        {tab === activeTab &&
                          filteredHoldings.length > PAGE_SIZE && (
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm text-muted-foreground">
                                Página {page + 1} de {totalPages}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={page === 0}
                                  onClick={() =>
                                    setPage((p) => Math.max(0, p - 1))
                                  }
                                >
                                  Anterior
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={page + 1 >= totalPages}
                                  onClick={() => setPage((p) => p + 1)}
                                >
                                  Próxima
                                </Button>
                              </div>
                            </div>
                          )}
                      </>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
