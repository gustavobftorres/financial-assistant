"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";

function formatCurrencyInput(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const profile = trpc.profile.get.useQuery();
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState("");

  const upsert = trpc.profile.upsert.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate();
      toast.success("Configurações salvas com sucesso");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!profile.data) return;

    const income = Number(profile.data.monthly_income ?? 0);
    const goal = Number(profile.data.monthly_savings_goal ?? 0);

    setMonthlyIncome(income > 0 ? formatCurrencyInput(income) : "");
    setMonthlySavingsGoal(goal > 0 ? formatCurrencyInput(goal) : "");
  }, [profile.data]);

  const incomeValue = useMemo(
    () => parseCurrencyInput(monthlyIncome),
    [monthlyIncome]
  );

  const goalValue = useMemo(
    () => parseCurrencyInput(monthlySavingsGoal),
    [monthlySavingsGoal]
  );

  const canSubmit = incomeValue > 0 && !upsert.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (incomeValue <= 0) {
      toast.error("Informe uma renda mensal maior que zero");
      return;
    }

    upsert.mutate({
      monthly_income: incomeValue,
      monthly_savings_goal: goalValue,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Atualize sua renda mensal e sua meta de economia.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Planejamento financeiro</CardTitle>
          <CardDescription>
            Esses valores são usados em métricas e recomendações do assistente.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="monthly-income">Renda mensal (R$)</FieldLabel>
                <Input
                  id="monthly-income"
                  type="text"
                  inputMode="numeric"
                  placeholder="5.000,00"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  disabled={upsert.isPending || profile.isLoading}
                  aria-invalid={incomeValue <= 0}
                />
                <FieldDescription>
                  Valor total recebido por mês.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="monthly-savings-goal">
                  Meta de economia mensal (R$)
                </FieldLabel>
                <Input
                  id="monthly-savings-goal"
                  type="text"
                  inputMode="numeric"
                  placeholder="1.000,00"
                  value={monthlySavingsGoal}
                  onChange={(e) => setMonthlySavingsGoal(e.target.value)}
                  disabled={upsert.isPending || profile.isLoading}
                />
                <FieldDescription>
                  Quanto você deseja guardar por mês.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {upsert.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
