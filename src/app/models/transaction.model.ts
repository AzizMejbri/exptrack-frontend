// models/transaction.model.ts
export interface Transaction {
  id: string;
  amount: number;
  type: 'expense' | 'revenue';
  category: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionSummary {
  totalExpenses: number;
  totalRevenue: number;
  revenueCount: number;
  expenseCount: number;
  netAmount: number;
  period: string;
  currency?: string;

}

export interface CategorySummary {
  category: string;
  amount: number;
  type: 'expense' | 'revenue';
  percentage: number;
  count?: number;
  color?: string;
}
