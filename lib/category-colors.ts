const DEFAULT_CATEGORY_COLOR = "hsl(var(--muted-foreground))";

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "hsl(12 76% 61%)",
  Restaurants: "hsl(20 83% 58%)",
  Groceries: "hsl(27 87% 55%)",
  Transportation: "hsl(210 79% 58%)",
  Fuel: "hsl(215 84% 52%)",
  "Public Transit": "hsl(221 83% 45%)",
  Entertainment: "hsl(280 76% 62%)",
  Streaming: "hsl(287 77% 55%)",
  Subscriptions: "hsl(295 74% 49%)",
  Health: "hsl(145 58% 45%)",
  Pharmacy: "hsl(152 60% 38%)",
  Education: "hsl(48 96% 53%)",
  Clothing: "hsl(330 81% 60%)",
  Home: "hsl(35 94% 58%)",
  Investments: "hsl(var(--positive))",
  Incomes: "hsl(164 67% 40%)",
  "Invoice Payment": "hsl(355 78% 57%)",
  Other: "hsl(var(--negative))",
  Outro: "hsl(var(--negative))",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}
