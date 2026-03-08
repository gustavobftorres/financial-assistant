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
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface EvolutionDataPoint {
  month: string;
  total: number;
  fixedCosts?: number;
  variableCosts?: number;
}

interface MonthlyEvolutionLineProps {
  data: EvolutionDataPoint[];
  spendingCap?: number | null;
}

function formatYAxisTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

const LINE_COLORS = {
  fixed: "hsl(210 79% 58%)",
  variable: "hsl(280 76% 62%)",
  total: "#ffffff",
};

export function MonthlyEvolutionLine({
  data,
  spendingCap,
}: MonthlyEvolutionLineProps) {
  const hasBreakdown =
    data.length > 0 &&
    (data[0].fixedCosts !== undefined || data[0].variableCosts !== undefined);

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
          formatter={(value, name) => [
            formatCurrency(Number(value ?? 0)),
            String(name ?? ""),
          ]}
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
        {hasBreakdown ? (
          <>
            <Line
              type="monotone"
              dataKey="fixedCosts"
              name="Custos fixos"
              stroke={LINE_COLORS.fixed}
              strokeWidth={2}
              dot={{ fill: LINE_COLORS.fixed, r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="variableCosts"
              name="Custos variáveis"
              stroke={LINE_COLORS.variable}
              strokeWidth={2}
              dot={{ fill: LINE_COLORS.variable, r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total"
              stroke={LINE_COLORS.total}
              strokeWidth={2}
              dot={{ fill: LINE_COLORS.total, r: 3 }}
              connectNulls
            />
            <Legend />
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="total"
            name="Gastos"
            stroke={LINE_COLORS.total}
            strokeWidth={2}
            dot={{ fill: LINE_COLORS.total, r: 3 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
