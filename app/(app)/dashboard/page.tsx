"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { SpendingByCategoryBar } from "@/components/charts/spending-by-category-bar";
import { MonthlyEvolutionLine } from "@/components/charts/monthly-evolution-line";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MonthlyOverviewCard } from "@/components/monthly-overview-card";

export default function DashboardPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: summary, isLoading: summaryLoading } =
    trpc.transactions.summary.useQuery({ month: currentMonth });

  const { data: evolution } = trpc.transactions.monthlyEvolution.useQuery({
    months: 6,
  });

  const { data: listData } = trpc.transactions.list.useQuery({
    month: currentMonth,
    type: "expense",
    limit: 500,
    offset: 0,
  });

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of listData?.data ?? []) {
      const cat = tx.category || "Outro";
      map[cat] = (map[cat] ?? 0) + Math.abs(Number(tx.amount));
    }
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [listData]);

  const profile = trpc.profile.get.useQuery();
  const savingsGoal = profile.data?.monthly_savings_goal ?? 0;
  const savingsAchieved = summary?.projectedBalance ?? 0;
  const progress =
    savingsGoal > 0
      ? Math.min(100, Math.max(0, (savingsAchieved / savingsGoal) * 100))
      : 0;

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Gastos do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold text-negative">
              {formatCurrency(summary?.totalExpense ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Receitas do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold text-positive">
              {formatCurrency(summary?.totalIncome ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo projetado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-mono font-semibold ${
                (summary?.projectedBalance ?? 0) >= 0
                  ? "text-positive"
                  : "text-negative"
              }`}
            >
              {formatCurrency(summary?.projectedBalance ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Meta de economia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {progress.toFixed(0)}% da meta
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length ? (
              <SpendingByCategoryBar data={byCategory} />
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                Sem dados este mês
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evolução mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {evolution?.length ? (
              <MonthlyEvolutionLine data={evolution} />
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                Sem dados
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length ? (
              <CategoryDonut data={byCategory} />
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                Sem dados este mês
              </p>
            )}
          </CardContent>
        </Card>
        <MonthlyOverviewCard />
      </div>
    </div>
  );
}
