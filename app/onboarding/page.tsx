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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseCurrencyInput } from "@/lib/utils";
import { SUPPORTED_BANKS } from "@/lib/csv/banks";

export default function OnboardingPage() {
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState("");
  const [bank, setBank] = useState<string>("generic");
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
      bank: bank as "nubank" | "banco_inter" | "generic",
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
            <div className="space-y-2">
              <label htmlFor="bank" className="text-sm font-medium">
                Banco para importação de CSV
              </label>
              <Select
                value={bank}
                onValueChange={(v) => v && setBank(v)}
                disabled={upsert.isPending}
              >
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Selecione seu banco">
                    {bank
                      ? SUPPORTED_BANKS.find((b) => b.id === bank)?.name
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_BANKS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Usado para interpretar o extrato em CSV ao importar transações.
              </p>
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
