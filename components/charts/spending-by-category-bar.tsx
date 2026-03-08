"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";
import { translateCategory } from "@/lib/category-labels";

interface DataPoint {
  category: string;
  total: number;
  budget?: number;
}

interface SpendingByCategoryBarProps {
  data: DataPoint[];
  colorMap?: Record<string, string>;
}

export function SpendingByCategoryBar({ data, colorMap }: SpendingByCategoryBarProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }} barGap={-12}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          type="number"
          tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
          className="text-xs"
        />
        <YAxis
          type="category"
          dataKey="category"
          width={75}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => translateCategory(String(value ?? ""))}
        />
        <Tooltip
          formatter={(value, name, props) => {
            const payload = props.payload as DataPoint | undefined;
            const spent = Number(payload?.total ?? 0);
            const budget = Number(payload?.budget ?? 0);
            if (name === "budget") {
              return [formatCurrency(Number(value ?? 0)), "Meta"];
            }
            if (budget > 0) {
              const ratio = (spent / budget) * 100;
              return [
                `${formatCurrency(Number(value ?? 0))} (${ratio.toFixed(0)}% da meta)`,
                "Gasto",
              ];
            }
            return [formatCurrency(Number(value ?? 0)), "Gasto"];
          }}
          labelFormatter={(label) => translateCategory(String(label ?? ""))}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Bar
          dataKey="budget"
          name="budget"
          radius={[0, 4, 4, 0]}
          barSize={12}
        >
          {data.map((entry) => (
            <Cell
              key={`budget-${entry.category}`}
              fill={getCategoryColor(entry.category, colorMap)}
              fillOpacity={0.3}
            />
          ))}
        </Bar>
        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={12}>
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={getCategoryColor(entry.category, colorMap)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
