import { z } from "zod";
import { router, authedProcedure } from "../init";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const categoriesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("categories")
      .select("id, name, color, sort_order")
      .eq("user_id", ctx.userId)
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  seedDefaults: authedProcedure.mutation(async ({ ctx }) => {
    const { data: existing } = await ctx.supabase
      .from("categories")
      .select("id")
      .eq("user_id", ctx.userId)
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error("Você já possui categorias. Use a edição para alterá-las.");
    }
    const rows = DEFAULT_CATEGORIES.map((d, i) => ({
      user_id: ctx.userId,
      name: d.name,
      color: d.color,
      sort_order: i,
    }));
    const { error } = await ctx.supabase.from("categories").insert(rows);
    if (error) throw new Error(error.message);
    return { success: true };
  }),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(hexColorRegex),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.supabase
        .from("categories")
        .select("id")
        .eq("user_id", ctx.userId)
        .eq("name", input.name.trim())
        .maybeSingle();
      if (existing) throw new Error("Já existe uma categoria com esse nome.");
      const { data: maxOrder } = await ctx.supabase
        .from("categories")
        .select("sort_order")
        .eq("user_id", ctx.userId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sortOrder = (maxOrder?.sort_order ?? -1) + 1;
      const { error } = await ctx.supabase.from("categories").insert({
        user_id: ctx.userId,
        name: input.name.trim(),
        color: input.color,
        sort_order: sortOrder,
      });
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().regex(hexColorRegex).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: row } = await ctx.supabase
        .from("categories")
        .select("name")
        .eq("id", input.id)
        .eq("user_id", ctx.userId)
        .single();
      if (!row) throw new Error("Categoria não encontrada.");
      const oldName = row.name;
      const updates: { name?: string; color?: string } = {};
      if (input.name !== undefined) updates.name = input.name.trim();
      if (input.color !== undefined) updates.color = input.color;
      if (Object.keys(updates).length === 0) return { success: true };
      if (updates.name && updates.name !== oldName) {
        const { error: txError } = await ctx.supabase
          .from("transactions")
          .update({ category: updates.name })
          .eq("user_id", ctx.userId)
          .eq("category", oldName);
        if (txError) throw new Error(txError.message);
        const { error: budgetError } = await ctx.supabase
          .from("category_budgets")
          .update({ category: updates.name })
          .eq("user_id", ctx.userId)
          .eq("category", oldName);
        if (budgetError) throw new Error(budgetError.message);
      }
      const { error } = await ctx.supabase
        .from("categories")
        .update(updates)
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: row } = await ctx.supabase
        .from("categories")
        .select("name")
        .eq("id", input.id)
        .eq("user_id", ctx.userId)
        .single();
      if (!row) throw new Error("Categoria não encontrada.");
      const { count } = await ctx.supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ctx.userId);
      if ((count ?? 0) <= 1) {
        throw new Error("Não é possível excluir a última categoria.");
      }
      const { error: txError } = await ctx.supabase
        .from("transactions")
        .update({ category: "Other" })
        .eq("user_id", ctx.userId)
        .eq("category", row.name);
      if (txError) throw new Error(txError.message);
      const { error: budgetError } = await ctx.supabase
        .from("category_budgets")
        .delete()
        .eq("user_id", ctx.userId)
        .eq("category", row.name);
      if (budgetError) throw new Error(budgetError.message);
      const { error } = await ctx.supabase
        .from("categories")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
