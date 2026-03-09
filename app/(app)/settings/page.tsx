"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { translateCategory } from "@/lib/category-labels";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/utils";
import { SUPPORTED_BANKS } from "@/lib/csv/banks";

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  for (let i = -2; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const profile = trpc.profile.get.useQuery();
  const categories = trpc.categories.list.useQuery();
  const categoryBudgets = trpc.budget.getCategoryBudgets.useQuery();
  const fixedCosts = trpc.budget.getFixedCosts.useQuery();
  const avgByCategory = trpc.transactions.avgByCategory.useQuery({ months: 6 });

  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState("");
  const [bank, setBank] = useState<string>("generic");

  const [fixedCostName, setFixedCostName] = useState("");
  const [fixedCostAmount, setFixedCostAmount] = useState("");
  const [fixedCostInstallments, setFixedCostInstallments] = useState("12");
  const [fixedCostStartMonth, setFixedCostStartMonth] = useState("");
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    if (!fixedCostStartMonth) setFixedCostStartMonth(currentMonth);
  }, [currentMonth, fixedCostStartMonth]);

  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate();
      toast.success("Configurações salvas com sucesso");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const upsertBudget = trpc.budget.upsertCategoryBudget.useMutation({
    onSuccess: async () => {
      await utils.budget.getCategoryBudgets.invalidate();
      toast.success("Meta salva");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteBudget = trpc.budget.deleteCategoryBudget.useMutation({
    onSuccess: async () => {
      await utils.budget.getCategoryBudgets.invalidate();
      toast.success("Meta removida");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const upsertFixedCost = trpc.budget.upsertFixedCost.useMutation({
    onSuccess: async () => {
      await utils.budget.getFixedCosts.invalidate();
      setFixedCostName("");
      setFixedCostAmount("");
      setFixedCostInstallments("12");
      setFixedCostStartMonth(currentMonth);
      toast.success("Custo fixo adicionado");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteFixedCost = trpc.budget.deleteFixedCost.useMutation({
    onSuccess: async () => {
      await utils.budget.getFixedCosts.invalidate();
      toast.success("Custo fixo removido");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const seedCategories = trpc.categories.seedDefaults.useMutation({
    onSuccess: async () => {
      await utils.categories.list.invalidate();
      toast.success("Categorias padrão restauradas");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: async () => {
      await utils.categories.list.invalidate();
      setNewCategoryName("");
      setNewCategoryColor("#3b82f6");
      setAddDialogOpen(false);
      toast.success("Categoria criada");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: async () => {
      await utils.categories.list.invalidate();
      await utils.budget.getCategoryBudgets.invalidate();
      setEditDialogOpen(false);
      setEditCategoryId("");
      toast.success("Categoria atualizada");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: async () => {
      await utils.categories.list.invalidate();
      await utils.budget.getCategoryBudgets.invalidate();
      toast.success("Categoria excluída");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    const income = Number(profile.data.monthly_income ?? 0);
    const goal = Number(profile.data.monthly_savings_goal ?? 0);
    const profileBank = profile.data.bank as string | null;
    setMonthlyIncome(income > 0 ? formatCurrencyInput(income) : "");
    setMonthlySavingsGoal(goal > 0 ? formatCurrencyInput(goal) : "");
    setBank(
      profileBank && ["nubank", "banco_inter", "generic"].includes(profileBank)
        ? profileBank
        : "generic"
    );
  }, [profile.data]);

  const incomeValue = useMemo(
    () => parseCurrencyInput(monthlyIncome),
    [monthlyIncome]
  );
  const goalValue = useMemo(
    () => parseCurrencyInput(monthlySavingsGoal),
    [monthlySavingsGoal]
  );

  const budgetMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of categoryBudgets.data ?? []) {
      m[b.category] = Number(b.monthly_limit);
    }
    return m;
  }, [categoryBudgets.data]);

  const avgMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of avgByCategory.data ?? []) {
      m[a.category] = a.avg;
    }
    return m;
  }, [avgByCategory.data]);

  const budgetCategories = useMemo(() => {
    const EXCLUDED = new Set(["Invoice Payment", "Incomes"]);
    return (categories.data ?? [])
      .map((c) => c.name)
      .filter((n) => !EXCLUDED.has(n))
      .sort();
  }, [categories.data]);

  const canSubmitProfile = incomeValue > 0 && !upsertProfile.isPending;

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (incomeValue <= 0) {
      toast.error("Informe uma renda mensal maior que zero");
      return;
    }
    upsertProfile.mutate({
      monthly_income: incomeValue,
      monthly_savings_goal: goalValue,
      bank: bank as "nubank" | "banco_inter" | "generic",
    });
  }

  function handleBudgetBlur(category: string, value: number) {
    if (value > 0) {
      upsertBudget.mutate({ category, monthly_limit: value });
    } else if (budgetMap[category] !== undefined) {
      deleteBudget.mutate({ category });
    }
  }

  function handleFixedCostSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseCurrencyInput(fixedCostAmount);
    const installments = parseInt(fixedCostInstallments, 10);
    if (!fixedCostName.trim()) {
      toast.error("Informe o nome do custo fixo");
      return;
    }
    if (amount <= 0) {
      toast.error("Informe um valor maior que zero");
      return;
    }
    if (isNaN(installments) || installments < 0) {
      toast.error("Parcelas deve ser 0 (recorrente) ou um número positivo");
      return;
    }
    if (!fixedCostStartMonth) {
      toast.error("Selecione o mês de início");
      return;
    }
    upsertFixedCost.mutate({
      name: fixedCostName.trim(),
      total_amount: amount,
      installments: installments === 0 ? 0 : installments,
      start_month: fixedCostStartMonth,
    });
  }

  const monthOptions = useMemo(() => getMonthOptions(), []);

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    createCategory.mutate({ name: newCategoryName.trim(), color: newCategoryColor });
  }

  function handleEditCategorySelect(id: string | null) {
    const safeId = id ?? "";
    setEditCategoryId(safeId);
    const cat = categories.data?.find((c) => c.id === safeId);
    if (cat) {
      setEditName(cat.name);
      setEditColor(cat.color);
    }
  }

  function handleSaveEdit() {
    if (!editCategoryId) return;
    if (!editName.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    updateCategory.mutate({
      id: editCategoryId,
      name: editName.trim(),
      color: editColor,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Atualize sua renda mensal, metas por categoria e custos fixos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planejamento financeiro</CardTitle>
          <CardDescription>
            Esses valores são usados em métricas e recomendações do assistente.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileSubmit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="monthly-income">Renda mensal (R$)</FieldLabel>
                <Input
                  id="monthly-income"
                  type="text"
                  inputMode="numeric"
                  placeholder="5.000,00"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  disabled={upsertProfile.isPending || profile.isLoading}
                  aria-invalid={incomeValue <= 0}
                />
                <FieldDescription>
                  Valor total recebido por mês.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="monthly-savings-goal">
                  Meta de economia mensal (R$)
                </FieldLabel>
                <Input
                  id="monthly-savings-goal"
                  type="text"
                  inputMode="numeric"
                  placeholder="1.000,00"
                  value={monthlySavingsGoal}
                  onChange={(e) => setMonthlySavingsGoal(e.target.value)}
                  disabled={upsertProfile.isPending || profile.isLoading}
                />
                <FieldDescription>
                  Quanto você deseja guardar por mês.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="bank">Banco para importação de CSV</FieldLabel>
                <Select
                  value={bank}
                  onValueChange={(v) => v && setBank(v)}
                  disabled={upsertProfile.isPending || profile.isLoading}
                >
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="Selecione seu banco">
                      {bank
                        ? SUPPORTED_BANKS.find((b) => b.id === bank)?.name
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_BANKS.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Usado para interpretar o extrato em CSV ao importar transações.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end mt-4">
            <Button type="submit" disabled={!canSubmitProfile}>
              {upsertProfile.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias de gastos</CardTitle>
          <CardDescription>
            Personalize as categorias usadas para classificar transações. A cor
            é usada nos gráficos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.data?.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria configurada. Restaure as categorias padrão
                para começar.
              </p>
              <Button
                onClick={() => seedCategories.mutate()}
                disabled={seedCategories.isPending}
              >
                {seedCategories.isPending
                  ? "Restaurando..."
                  : "Restaurar categorias padrão"}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(categories.data ?? []).map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <span
                      className="size-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm">{cat.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteCategory.mutate({ id: cat.id })}
                      disabled={deleteCategory.isPending}
                      aria-label={`Excluir ${cat.name}`}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setAddDialogOpen(true)}>Adicionar</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditCategoryId("");
                    setEditDialogOpen(true);
                  }}
                >
                  Editar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setNewCategoryName("");
            setNewCategoryColor("#3b82f6");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription>
              Informe o nome e a cor da nova categoria.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleAddCategory}
            className="flex flex-col gap-4"
          >
            <Field>
              <FieldLabel htmlFor="add-cat-name">Nome</FieldLabel>
              <Input
                id="add-cat-name"
                placeholder="Ex: Restaurantes"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={createCategory.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-cat-color">Cor</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  id="add-cat-color"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-input"
                />
                <span className="text-sm text-muted-foreground">
                  {newCategoryColor}
                </span>
              </div>
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditCategoryId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>
              Selecione a categoria e altere nome ou cor.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Categoria</FieldLabel>
              <Select
                value={editCategoryId}
                onValueChange={handleEditCategorySelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span
                        className="mr-2 inline-block size-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {editCategoryId && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-cat-name">Nome</FieldLabel>
                  <Input
                    id="edit-cat-name"
                    placeholder="Nome"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={updateCategory.isPending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-cat-color">Cor</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      id="edit-cat-color"
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border border-input"
                    />
                    <span className="text-sm text-muted-foreground">
                      {editColor}
                    </span>
                  </div>
                </Field>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updateCategory.isPending}
                  >
                    {updateCategory.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Metas por categoria</CardTitle>
          <CardDescription>
            Defina um limite mensal de gastos por categoria. A média indica quanto
            você vem gastando nos últimos 6 meses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgetCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Configure primeiro as categorias de gastos acima.
              </p>
            ) : null}
            {budgetCategories.map((category) => {
              const limit = budgetMap[category];
              const avg = avgMap[category];
              const displayValue =
                budgetInputs[category] ??
                (limit !== undefined && limit > 0 ? formatCurrencyInput(limit) : "");
              return (
                <div
                  key={category}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {translateCategory(category)}
                    </span>
                    {limit !== undefined && limit > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          deleteBudget.mutate({ category });
                          setBudgetInputs((p) => ({ ...p, [category]: "" }));
                        }}
                        disabled={deleteBudget.isPending}
                        aria-label={`Remover meta de ${translateCategory(category)}`}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    )}
                  </div>
                  {avg !== undefined && avg > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Média: {formatCurrency(avg)}/mês
                    </p>
                  )}
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={displayValue}
                    onChange={(e) =>
                      setBudgetInputs((p) => ({ ...p, [category]: e.target.value }))
                    }
                    onBlur={(e) => {
                      const v = parseCurrencyInput(e.target.value);
                      handleBudgetBlur(category, v);
                      setBudgetInputs((p) => {
                        const next = { ...p };
                        delete next[category];
                        return next;
                      });
                    }}
                    disabled={upsertBudget.isPending}
                    className="h-8"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custos fixos</CardTitle>
          <CardDescription>
            Adicione custos que não vêm por CSV (aluguel, assinaturas, etc.).
            Informe o valor total e a quantidade de parcelas. Use 0 para custos
            recorrentes indefinidamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleFixedCostSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="fixed-cost-name">Nome</FieldLabel>
                <Input
                  id="fixed-cost-name"
                  placeholder="Ex: Netflix, Aluguel"
                  value={fixedCostName}
                  onChange={(e) => setFixedCostName(e.target.value)}
                  disabled={upsertFixedCost.isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fixed-cost-amount">Valor total (R$)</FieldLabel>
                <Input
                  id="fixed-cost-amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="120,00"
                  value={fixedCostAmount}
                  onChange={(e) => setFixedCostAmount(e.target.value)}
                  disabled={upsertFixedCost.isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fixed-cost-installments">
                  Parcelas
                </FieldLabel>
                <Input
                  id="fixed-cost-installments"
                  type="number"
                  min={0}
                  placeholder="12"
                  value={fixedCostInstallments}
                  onChange={(e) => setFixedCostInstallments(e.target.value)}
                  disabled={upsertFixedCost.isPending}
                />
                <FieldDescription>
                  0 = recorrente; 1 = único; 12 = 12 parcelas
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="fixed-cost-start">Início</FieldLabel>
                <Select
                  value={fixedCostStartMonth}
                  onValueChange={(v) => v && setFixedCostStartMonth(v)}
                  disabled={upsertFixedCost.isPending}
                >
                  <SelectTrigger id="fixed-cost-start" className="w-full">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={upsertFixedCost.isPending}>
              {upsertFixedCost.isPending ? "Adicionando..." : "Adicionar custo fixo"}
            </Button>
          </form>

          {(fixedCosts.data?.length ?? 0) > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Custos cadastrados</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor total</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedCosts.data?.map((fc) => (
                    <TableRow key={fc.id}>
                      <TableCell>{fc.name}</TableCell>
                      <TableCell>{formatCurrency(Number(fc.total_amount))}</TableCell>
                      <TableCell>
                        {fc.installments === 0 ? "Recorrente" : fc.installments}
                      </TableCell>
                      <TableCell>{fc.start_month}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteFixedCost.mutate({ id: fc.id })}
                          disabled={deleteFixedCost.isPending}
                          aria-label={`Remover ${fc.name}`}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
