"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const ASSET_COLORS: Record<string, string> = {
  acao: "hsl(210 79% 58%)",
  fii: "hsl(145 58% 45%)",
  tesouro: "hsl(48 96% 53%)",
  crypto: "hsl(280 76% 62%)",
  outros: "hsl(var(--muted-foreground))",
};

const ASSET_LABELS: Record<string, string> = {
  acao: "Ações",
  fii: "Fundos Imobiliários",
  tesouro: "Tesouro / Renda Fixa",
  crypto: "Cripto",
  outros: "Outros",
};

interface DataPoint {
  name: string;
  value: number;
  type: string;
  percent: number;
}

interface PortfolioDonutProps {
  holdings: { asset_type: string; totalValue: number }[];
  cryptoTotal?: number;
}

export function PortfolioDonut({ holdings, cryptoTotal = 0 }: PortfolioDonutProps) {
  const byType = new Map<string, number>();

  for (const h of holdings) {
    const type =
      h.asset_type === "fii"
        ? "fii"
        : h.asset_type === "tesouro"
          ? "tesouro"
          : h.asset_type === "acao"
            ? "acao"
            : "outros";
    byType.set(type, (byType.get(type) ?? 0) + h.totalValue);
  }

  if (cryptoTotal > 0) {
    byType.set("crypto", (byType.get("crypto") ?? 0) + cryptoTotal);
  }

  const total = Array.from(byType.values()).reduce((a, b) => a + b, 0);
  const data: DataPoint[] = Array.from(byType.entries())
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: ASSET_LABELS[type] ?? type,
      value,
      type,
      percent: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Nenhum investimento para exibir
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry) => (
              <Cell key={entry.type} fill={ASSET_COLORS[entry.type] ?? "hsl(var(--muted-foreground))"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value ?? 0)), "Valor"]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-2">
        {data.map((entry) => (
          <Badge key={entry.type} variant="outline">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: ASSET_COLORS[entry.type] }}
            />
            {entry.name} ({entry.percent.toFixed(1)}%)
          </Badge>
        ))}
      </div>
    </div>
  );
}
