"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

interface DataPoint {
  month: string;
  monthLabel: string;
  total: number;
}

interface DividendsBarProps {
  data: { month: string; total: number }[];
}

export function DividendsBar({ data }: DividendsBarProps) {
  const chartData: DataPoint[] = data.map((d) => {
    const [, m] = d.month.split("-");
    return {
      month: d.month,
      monthLabel: `${MONTH_LABELS[m ?? ""] ?? m} ${d.month.slice(0, 4)}`,
      total: d.total,
    };
  });

  if (chartData.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Nenhum dividendo registrado
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0)), "Dividendos"]}
          labelFormatter={(_, payload) => {
            const p = payload[0]?.payload as DataPoint | undefined;
            return p?.monthLabel ?? "";
          }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Bar
          dataKey="total"
          fill="hsl(var(--positive))"
          radius={[4, 4, 0, 0]}
          name="Dividendos"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
