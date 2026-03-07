export interface UserContext {
  monthly_income: number;
  monthly_savings_goal: number;
  spending_patterns: {
    category: string;
    avg_monthly: number;
    trend: "up" | "down" | "stable";
  }[];
  last_month_summary: {
    total_spent: number;
    total_income: number;
    top_3_categories: string[];
    savings_achieved: number;
  };
  recent_transactions: {
    date: string;
    description: string;
    amount: number;
    category: string;
  }[];
}
