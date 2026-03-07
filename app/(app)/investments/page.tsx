"use client";

import { trpc } from "@/lib/trpc/client";
import { CsvUploader } from "@/components/csv-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

export default function InvestmentsPage() {
  const utils = trpc.useUtils();

  const { data: listData, isLoading } = trpc.investments.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: summary } = trpc.investments.summary.useQuery();

  const importMutation = trpc.investments.import.useMutation({
    onSuccess: (result) => {
      utils.investments.list.invalidate();
      utils.investments.summary.invalidate();
      toast.success(`${result.inserted} registros importados`);
    },
    onError: (e) => toast.error(e.message),
  });

  const evolutionData =
    listData?.data
      .filter((i) => i.operation !== "sell")
      .reduce((acc, inv) => {
        const d = inv.date;
        const val = Number(inv.total_value) ?? 0;
        const existing = acc.find((e: { date: string; total: number }) => e.date === d);
        if (existing) existing.total += val;
        else acc.push({ date: d, total: val });
        return acc;
      }, [] as { date: string; total: number }[])
      .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Investimentos</h1>

      <CsvUploader
        type="investments"
        onUpload={async (content, fileName) => {
          await importMutation.mutateAsync({ csvContent: content, fileName });
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Patrimônio líquido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono font-semibold text-positive">
            {formatCurrency(summary?.totalNetWorth ?? 0)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do patrimônio</CardTitle>
          </CardHeader>
          <CardContent>
            {evolutionData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value ?? 0)),
                      "Total",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={{ fill: "#22C55E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                Importe um CSV para ver a evolução
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de investimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground py-8 text-center">
                Carregando...
              </p>
            ) : !listData?.data.length ? (
              <p className="text-muted-foreground py-8 text-center">
                Nenhum investimento. Importe um CSV para começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right font-mono">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listData.data.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {formatDate(inv.date)}
                      </TableCell>
                      <TableCell>{inv.asset_name}</TableCell>
                      <TableCell>{inv.asset_type || "-"}</TableCell>
                      <TableCell className="text-right font-mono text-positive">
                        {formatCurrency(Number(inv.total_value) ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
