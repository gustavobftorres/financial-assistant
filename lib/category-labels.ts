const CATEGORY_LABELS: Record<string, string> = {
  "Food & Dining": "Alimentação",
  Restaurants: "Restaurantes",
  Groceries: "Supermercado",
  Transportation: "Transporte",
  Fuel: "Combustível",
  "Public Transit": "Transporte público",
  Entertainment: "Entretenimento",
  Streaming: "Streaming",
  Subscriptions: "Assinaturas",
  Health: "Saúde",
  Pharmacy: "Farmácia",
  Education: "Educação",
  Clothing: "Roupas",
  Home: "Casa",
  Investments: "Investimentos",
  Incomes: "Receitas",
  "Invoice Payment": "Pagamento de faturas",
  Other: "Outro",
  Outro: "Outro",
};

export function translateCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
