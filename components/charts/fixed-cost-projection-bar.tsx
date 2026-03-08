"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

interface FixedCost {
  name: string;
  total_amount: number;
  installments: number;
  start_month: string;
}

const CHART_COLORS = [
  "hsl(210 79% 58%)",
  "hsl(280 76% 62%)",
  "hsl(145 58% 45%)",
  "hsl(48 96% 53%)",
  "hsl(330 81% 60%)",
  "hsl(35 94% 58%)",
  "hsl(12 76% 61%)",
  "hsl(295 74% 49%)",
];

function parseMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[m - 1]} ${y}`;
}

export function FixedCostProjectionBar({
  fixedCosts,
}: {
  fixedCosts: FixedCost[];
}) {
  const { data, names } = useMemo(() => {
    const now = new Date();
    const data: Record<string, number | string>[] = [];
    const nameSet = new Set<string>();

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthNum = parseMonth(monthKey);

      const row: Record<string, number | string> = {
        month: monthKey,
        monthLabel: formatMonth(monthKey),
      };

      for (const fc of fixedCosts) {
        nameSet.add(fc.name);
        const startNum = parseMonth(fc.start_month);
        if (monthNum < startNum) {
          row[fc.name] = 0;
          continue;
        }

        const monthlyAmount =
          fc.installments > 0
            ? Number(fc.total_amount) / fc.installments
            : Number(fc.total_amount);

        const endNum =
          fc.installments > 0 ? startNum + fc.installments : Infinity;
        if (monthNum >= endNum) {
          row[fc.name] = 0;
          continue;
        }

        row[fc.name] = Math.round(monthlyAmount * 100) / 100;
      }

      data.push(row);
    }

    return {
      data,
      names: Array.from(nameSet),
    };
  }, [fixedCosts]);

  if (fixedCosts.length === 0 || names.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="monthLabel"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          width={80}
          tickFormatter={(v) => `R$ ${(Number(v ?? 0) / 1000).toFixed(1)}k`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const total = payload.reduce(
              (sum, p) => sum + Number(p.value ?? 0),
              0
            );
            return (
              <div
                className="rounded-md border bg-card px-3 py-2 text-sm shadow-md"
                style={{
                  borderColor: "hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                }}
              >
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground">
                  Total: {formatCurrency(total)}
                </p>
              </div>
            );
          }}
        />
        <Legend />
        {names.map((name, i) => (
          <Bar
            key={name}
            dataKey={name}
            stackId="a"
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={i === names.length - 1 ? [0, 4, 4, 0] : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
