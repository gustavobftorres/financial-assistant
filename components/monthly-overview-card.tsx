"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function MonthlyOverviewCard() {
  const [insights, setInsights] = useState<string | null>(null);
  const mutation = trpc.ai.insights.useMutation({
    onSuccess: (data) => setInsights(data.response),
    onError: () => setInsights("Erro ao gerar insights. Tente novamente."),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Insights do mês</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${mutation.isPending ? "animate-spin" : ""}`}
          />
          {mutation.isPending ? "Analisando..." : "Atualizar análise"}
        </Button>
      </CardHeader>
      <CardContent>
        {insights ? (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {insights}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Clique em &quot;Atualizar análise&quot; para gerar insights com base
            nos seus gastos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
