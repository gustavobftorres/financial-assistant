"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { CsvUploader } from "@/components/csv-uploader";
import { TransactionTable } from "@/components/transaction-table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

export default function TransactionsPage() {
  const [month, setMonth] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [type, setType] = useState<"income" | "expense" | "all">("all");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.transactions.list.useQuery({
    month: month === "all" ? undefined : month,
    category: category === "all" ? undefined : category,
    type,
    limit: pageSize,
    offset: page * pageSize,
  });

  const updateCategory = trpc.transactions.updateCategory.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      toast.success("Categoria atualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const importMutation = trpc.transactions.import.useMutation({
    onSuccess: (result) => {
      utils.transactions.list.invalidate();
      setPage(0);
      toast.success(
        `${result.inserted} transações importadas${result.duplicates > 0 ? `, ${result.duplicates} duplicadas ignoradas` : ""}`
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      );
    }
    return opts;
  }, []);

  const categories = [
    "Food & Dining",
    "Restaurants",
    "Groceries",
    "Transportation",
    "Entertainment",
    "Subscriptions",
    "Health",
    "Education",
    "Home",
    "Investments",
    "Other",
  ];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transações</h1>

      <CsvUploader
        type="transactions"
        onUpload={async (content, fileName) => {
          await importMutation.mutateAsync({ csvContent: content, fileName });
        }}
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Lista</CardTitle>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <SlidersHorizontal className="size-3.5" />
              Filtros
            </div>
          </div>
          <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 md:grid-cols-3">
            <Select
              value={month}
              onValueChange={(v) => {
                setMonth(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full bg-card" size="sm">
                <SelectValue placeholder="Mês de referência" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Mês</SelectLabel>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {new Date(`${m}-01T12:00:00`).toLocaleDateString("pt-BR", {
                        month: "short",
                        year: "numeric",
                      })}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full bg-card" size="sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Categoria</SelectLabel>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as "income" | "expense" | "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full bg-card" size="sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Tipo</SelectLabel>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">
              Carregando...
            </p>
          ) : !data?.data.length ? (
            <p className="text-muted-foreground py-8 text-center">
              Nenhuma transação. Importe um CSV para começar.
            </p>
          ) : (
            <>
              <TransactionTable
                transactions={data.data}
                onCategoryChange={(id, cat) =>
                  updateCategory.mutate({ id, category: cat })
                }
              />
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
