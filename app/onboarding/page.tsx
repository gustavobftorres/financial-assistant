"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { parseCurrencyInput } from "@/lib/utils";

export default function OnboardingPage() {
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState("");
  const router = useRouter();
  const upsert = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const income = parseCurrencyInput(monthlyIncome);
    const goal = parseCurrencyInput(monthlySavingsGoal);
    if (isNaN(income) || income <= 0) return;
    upsert.mutate({
      monthly_income: income,
      monthly_savings_goal: isNaN(goal) ? 0 : goal,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle className="font-mono text-xl">Bem-vindo ao FroshFunds</CardTitle>
          <CardDescription>
            Configure seus dados financeiros para começar
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="income" className="text-sm font-medium">
                Renda mensal (R$)
              </label>
              <Input
                id="income"
                type="text"
                placeholder="5.000,00"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                required
                disabled={upsert.isPending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="goal" className="text-sm font-medium">
                Meta de economia mensal (R$)
              </label>
              <Input
                id="goal"
                type="text"
                placeholder="1.000,00"
                value={monthlySavingsGoal}
                onChange={(e) => setMonthlySavingsGoal(e.target.value)}
                disabled={upsert.isPending}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={upsert.isPending}
            >
              {upsert.isPending ? "Salvando..." : "Continuar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
