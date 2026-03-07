"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  month: string;
  total: number;
}

interface MonthlyEvolutionLineProps {
  data: DataPoint[];
  spendingCap?: number | null;
}

function formatYAxisTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export function MonthlyEvolutionLine({
  data,
  spendingCap,
}: MonthlyEvolutionLineProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          width={80}
          tickFormatter={(v) => formatYAxisTick(Number(v ?? 0))}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0)), "Gastos"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        {typeof spendingCap === "number" && Number.isFinite(spendingCap) ? (
          <ReferenceLine
            y={spendingCap}
            ifOverflow="extendDomain"
            stroke="#ffffff"
            strokeOpacity={0.75}
            strokeDasharray="6 6"
            label={{
              value: `Teto: ${formatCurrency(spendingCap)}`,
              position: "insideTopRight",
              fill: "#ffffff",
              fontSize: 11,
            }}
          />
        ) : null}
        <Line
          type="monotone"
          dataKey="total"
          stroke="#ffffff"
          strokeWidth={2}
          dot={{ fill: "#ffffff", r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
