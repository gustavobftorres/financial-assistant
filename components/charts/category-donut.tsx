"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";

interface DataPoint {
  category: string;
  total: number;
}

export function CategoryDonut({ data }: { data: DataPoint[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="total"
          >
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={getCategoryColor(entry.category)}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
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
          <Badge key={entry.category} variant="outline">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: getCategoryColor(entry.category) }}
            />
            {entry.category}
          </Badge>
        ))}
      </div>
    </div>
  );
}
