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

interface DataPoint {
  category: string;
  total: number;
}

export function SpendingByCategoryBar({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
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
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0)), "Total"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={getCategoryColor(entry.category)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
