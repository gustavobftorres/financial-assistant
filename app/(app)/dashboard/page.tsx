"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { SpendingByCategoryBar } from "@/components/charts/spending-by-category-bar";
import {
  MonthlyEvolutionLine,
  type EvolutionDataPoint,
} from "@/components/charts/monthly-evolution-line";
import { CategoryDonut } from "@/components/charts/category-donut";
import { FixedCostProjectionBar } from "@/components/charts/fixed-cost-projection-bar";
import { LoadingCoin } from "@/components/loading-coin";

const EXCLUDED_CATEGORIES_FROM_CHARTS = new Set(["Invoice Payment", "Incomes"]);

function computeFixedCostForMonth(
  fixedCosts: { total_amount: number; installments: number; start_month: string }[],
  monthKey: string
): number {
  const [y, m] = monthKey.split("-").map(Number);
  const monthNum = y * 12 + (m - 1);
  let sum = 0;
  for (const fc of fixedCosts) {
    const [sy, sm] = fc.start_month.split("-").map(Number);
    const startNum = sy * 12 + (sm - 1);
    if (monthNum < startNum) continue;
    const monthlyAmount =
      fc.installments > 0
        ? Number(fc.total_amount) / fc.installments
        : Number(fc.total_amount);
    const endNum =
      fc.installments > 0 ? startNum + fc.installments : Infinity;
    if (monthNum >= endNum) continue;
    sum += monthlyAmount;
  }
  return Math.round(sum * 100) / 100;
}

export default function DashboardPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;

  const { data: summary, isLoading: summaryLoading } =
    trpc.transactions.summary.useQuery({ month: currentMonth });
  const { data: previousSummary } = trpc.transactions.summary.useQuery({
    month: previousMonth,
  });

  const { data: evolution } = trpc.transactions.monthlyEvolution.useQuery({
    months: 6,
  });

  const { data: listData } = trpc.transactions.list.useQuery({
    month: currentMonth,
    type: "expense",
    limit: 500,
    offset: 0,
  });

  const { data: categoryBudgets } = trpc.budget.getCategoryBudgets.useQuery();
  const { data: fixedCosts } = trpc.budget.getFixedCosts.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of listData?.data ?? []) {
      const cat = tx.category || "Outro";
      if (EXCLUDED_CATEGORIES_FROM_CHARTS.has(cat)) {
        continue;
      }
      map[cat] = (map[cat] ?? 0) + Math.abs(Number(tx.amount));
    }
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [listData]);

  const spendingByCategoryWithBudget = useMemo(() => {
    const budgetMap = new Map<string, number>();
    for (const budget of categoryBudgets ?? []) {
      budgetMap.set(budget.category, Number(budget.monthly_limit));
    }
    return byCategory.map((item) => {
      const budget = budgetMap.get(item.category);
      return budget && budget > 0 ? { ...item, budget } : item;
    });
  }, [byCategory, categoryBudgets]);

  const categoryColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categories ?? []) {
      m[c.name] = c.color;
    }
    return m;
  }, [categories]);

  const evolutionWithBreakdown = useMemo((): EvolutionDataPoint[] => {
    const evo = evolution ?? [];
    const fcs = fixedCosts ?? [];
    if (evo.length === 0) return [];
    return evo.map(({ month, total }) => {
      const fixed = computeFixedCostForMonth(fcs, month);
      const variable = Math.max(0, total - fixed);
      return {
        month,
        total,
        fixedCosts: fixed,
        variableCosts: variable,
      };
    });
  }, [evolution, fixedCosts]);

  const profile = trpc.profile.get.useQuery();
  const monthlyIncome = Number(profile.data?.monthly_income ?? 0);
  const monthlySavingsGoal = Number(profile.data?.monthly_savings_goal ?? 0);
  const spendingCap = monthlyIncome - monthlySavingsGoal;
  const savingsAchieved = summary?.projectedBalance ?? 0;
  const progress =
    monthlySavingsGoal > 0
      ? Math.min(100, Math.max(0, (savingsAchieved / monthlySavingsGoal) * 100))
      : 0;

  function calculateMonthOverMonth(current: number, prev: number): number | null {
    if (prev === 0) return null;
    return ((current - prev) / prev) * 100;
  }

  const incomeMoM = calculateMonthOverMonth(
    summary?.totalIncome ?? 0,
    previousSummary?.totalIncome ?? 0
  );
  const expenseMoM = calculateMonthOverMonth(
    summary?.totalExpense ?? 0,
    previousSummary?.totalExpense ?? 0
  );

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <LoadingCoin label="Carregando dashboard..." className="py-6" />
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
              Receitas do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-positive">
              {formatCurrency(summary?.totalIncome ?? 0)}
            </p>
            <p
              className={`mt-1 text-xs ${
                incomeMoM === null
                  ? "text-muted-foreground"
                  : incomeMoM >= 0
                    ? "text-positive"
                    : "text-negative"
              }`}
            >
              {incomeMoM === null
                ? "Sem base no mês anterior"
                : `${incomeMoM >= 0 ? "+" : ""}${incomeMoM.toFixed(1)}% vs mês anterior`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Gastos do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-negative">
              {formatCurrency(summary?.totalExpense ?? 0)}
            </p>
            <p
              className={`mt-1 text-xs ${
                expenseMoM === null
                  ? "text-muted-foreground"
                  : expenseMoM >= 0
                    ? "text-positive"
                    : "text-negative"
              }`}
            >
              {expenseMoM === null
                ? "Sem base no mês anterior"
                : `${expenseMoM >= 0 ? "+" : ""}${expenseMoM.toFixed(1)}% vs mês anterior`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo restante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-semibold ${
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
              <SpendingByCategoryBar
                data={spendingByCategoryWithBudget}
                colorMap={categoryColorMap}
              />
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
            {evolutionWithBreakdown.length ? (
              <MonthlyEvolutionLine
                data={evolutionWithBreakdown}
                spendingCap={spendingCap}
              />
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                Sem dados
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {byCategory.length ? (
            <CategoryDonut
              data={byCategory}
              colorMap={categoryColorMap}
            />
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              Sem dados este mês
            </p>
          )}
        </CardContent>
      </Card>

      {(fixedCosts?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projeção de custos fixos (12 meses)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Previsão mensal dos custos fixos cadastrados nas configurações.
            </p>
          </CardHeader>
          <CardContent>
            <FixedCostProjectionBar fixedCosts={fixedCosts ?? []} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
