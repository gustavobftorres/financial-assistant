"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DataPoint {
  date: string;
  dateLabel: string;
  carteira: number;
  cdi: number;
}

interface PortfolioVsCDIChartProps {
  data: DataPoint[];
  rendimentoCarteira: number;
  rendimentoCDI: number;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

export function PortfolioVsCDIChart({
  data,
  rendimentoCarteira,
  rendimentoCDI,
}: PortfolioVsCDIChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Dados insuficientes para exibir o gráfico
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Rentabilidade Carteira: </span>
          <span className="font-semibold">{rendimentoCarteira.toFixed(2)}%</span>
        </div>
        <div>
          <span className="text-muted-foreground">Rentabilidade CDI: </span>
          <span className="font-semibold">{rendimentoCDI.toFixed(2)}%</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number) => [`${Number(value).toFixed(2)}%`, ""]}
            labelFormatter={(_, payload) => {
              const p = payload[0]?.payload as DataPoint | undefined;
              return p?.dateLabel ?? "";
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="carteira"
            name="Carteira"
            stroke="hsl(25 95% 53%)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="cdi"
            name="CDI"
            stroke="hsl(142 76% 36%)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function buildPerformanceData(
  evolutionData: { date: string; total: number }[],
  cdiHistory: { date: string; rate: number }[],
  netFlowsByMonth: Record<string, number> = {}
): {
  data: DataPoint[];
  rendimentoCarteira: number;
  rendimentoCDI: number;
} {
  if (evolutionData.length === 0) {
    return { data: [], rendimentoCarteira: 0, rendimentoCDI: 0 };
  }

  const cdiByMonth = new Map<string, number>();
  for (const r of cdiHistory) {
    const key = r.date.slice(0, 7);
    cdiByMonth.set(key, r.rate);
  }

  const lastByMonth = new Map<string, number>();
  const sorted = [...evolutionData].sort((a, b) => a.date.localeCompare(b.date));
  for (const point of sorted) {
    lastByMonth.set(point.date.slice(0, 7), point.total);
  }

  const monthsWithData = Array.from(lastByMonth.keys()).sort();
  const firstMonth = monthsWithData[0] ?? "";
  const lastMonth = monthsWithData[monthsWithData.length - 1] ?? "";

  const allMonths: string[] = [];
  const [fy, fm] = firstMonth.split("-").map(Number);
  const [ly, lm] = lastMonth.split("-").map(Number);
  for (let y = fy; y <= ly; y++) {
    const mStart = y === fy ? fm : 1;
    const mEnd = y === ly ? lm : 12;
    for (let m = mStart; m <= mEnd; m++) {
      allMonths.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }

  let lastKnown = 0;
  const valueByMonth = new Map<string, number>();
  for (const month of allMonths) {
    const v = lastByMonth.get(month);
    if (v != null) lastKnown = v;
    valueByMonth.set(month, lastKnown);
  }

  const startValue = valueByMonth.get(firstMonth) ?? 0;
  const endValue = valueByMonth.get(lastMonth) ?? 0;

  let cdiCumulative = 1;
  let cumulativeNetFlow = 0;
  const data: DataPoint[] = [];

  for (let i = 0; i < allMonths.length; i++) {
    const month = allMonths[i] ?? "";
    const total = valueByMonth.get(month) ?? 0;
    const netFlow = netFlowsByMonth[month] ?? 0;
    if (i > 0) cumulativeNetFlow += netFlow;

    const rate = cdiByMonth.get(month) ?? 0;
    cdiCumulative *= 1 + rate / 100;

    const [y, m] = month.split("-");
    const dateLabel = `${m}/${y}`;

    const carteiraPct =
      startValue > 0
        ? ((total - startValue - cumulativeNetFlow) / startValue) * 100
        : 0;
    const cdiPct = (cdiCumulative - 1) * 100;

    data.push({
      date: `${month}-01`,
      dateLabel,
      carteira: carteiraPct,
      cdi: cdiPct,
    });
  }

  const totalNetFlow = allMonths
    .slice(1)
    .reduce((s, m) => s + (netFlowsByMonth[m] ?? 0), 0);
  const rendimentoCarteira =
    startValue > 0
      ? ((endValue - startValue - totalNetFlow) / startValue) * 100
      : 0;
  const rendimentoCDI = (cdiCumulative - 1) * 100;

  return { data, rendimentoCarteira, rendimentoCDI };
}
