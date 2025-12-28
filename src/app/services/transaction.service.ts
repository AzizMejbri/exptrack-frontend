import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Transaction, TransactionSummary, CategorySummary } from '../models/transaction.model';
import { AuthService } from '../auth/auth';

// Define interfaces for reports (keep your existing interfaces)
export interface ReportData {
  type: 'expense' | 'revenue' | 'all';
  startDate: string;
  endDate: string;
  format: 'pdf' | 'csv' | 'json';
}

export interface ExpenseReport {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  percentage: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

export interface MonthlyBreakdown {
  month: string;
  amount: number;
  percentage: number;
}

export interface IncomeStatement {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grossMargin: number;
  categories: {
    revenue: CategoryBreakdown[];
    expenses: CategoryBreakdown[];
  };
}

export interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
}

export interface TrendAnalysis {
  period: string;
  totalAmount: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
  forecast?: number;
}

export interface CategoryDetail {
  category: string;
  type: 'expense' | 'revenue';
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  monthlyData?: MonthlyData[];
}

export interface MonthlyData {
  month: string;
  amount: number;
  transactionCount: number;
}

export interface CategoryStatsResponse {
  expenseCategories: CategoryDetail[];
  revenueCategories: CategoryDetail[];
  timeFrame: string;
  summary: {
    totalExpenses: number;
    totalRevenue: number;
    averageTransaction: number;
    mostSpentCategory: string;
    mostRevenueCategory: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = 'https://localhost:8443/api'; // Spring Boot backend URL
  private userId: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {
    // Get user ID from auth service
    const currentUser = this.authService.getCurrentUser();
    this.userId = currentUser?.id || null;

    // Debug logging
    console.log('🏗️ TransactionService initialized');
    console.log('👤 Current User:', currentUser);
    console.log('🆔 User ID:', this.userId);

    if (!this.userId) {
      console.warn('⚠️ WARNING: No user ID found. Service will return mock data.');
    }
  }

  // Helper to get base URL with user ID
  private getBaseUrl(): string {
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    return `${this.apiUrl}/users/${this.userId}/transactions`;
  }

  // Helper to get request options with credentials (for cookies)
  private getRequestOptions(params?: HttpParams): {
    headers: HttpHeaders;
    params?: HttpParams;
    withCredentials: boolean;
  } {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      ...(params && { params }),
      withCredentials: true
    };
  }

  // Debug method to check authentication
  checkAuth(): void {
    console.log('=== AUTH DEBUG ===');
    const currentUser = this.authService.getCurrentUser();
    console.log('Current User:', currentUser);
    console.log('User ID:', this.userId);
    console.log('Is Authenticated:', !!this.userId);
    console.log('==================');
  }

  // Get transactions with filtering and pagination
  // getTransactions(timeFrame: string, limit: number = 10, page: number = 1): Observable<Transaction[]> {
  //   console.log('🔍 getTransactions called with:', { timeFrame, limit, page });
  //
  //   const userId = this.userId;
  //   console.log('📝 User ID:', userId);
  //
  //   if (!userId) {
  //     console.error('❌ No user ID found! User may not be authenticated.');
  //     return of([]); // Return empty, will fallback to mock
  //   }
  //
  //   const params = new HttpParams()
  //     .set('timeFrame', timeFrame)
  //     .set('limit', limit.toString())
  //     .set('page', page.toString());
  //
  //   const url = `${this.apiUrl}/users/${userId}/transactions`;
  //   console.log('🌐 API URL:', url);
  //   console.log('📋 Params:', params.toString());
  //
  //   return this.http.get<Transaction[]>(url, this.getRequestOptions(params)).pipe(
  //     map(transactions => {
  //       console.log('✅ Backend Response:', transactions);
  //       const mapped = this.mapTransactions(transactions);
  //       console.log('🗺️ Mapped Transactions:', mapped);
  //       return mapped;
  //     }),
  //     catchError(error => {
  //       console.error('❌ Error fetching transactions:', error);
  //       console.error('Error Status:', error.status);
  //       console.error('Error Message:', error.message);
  //       console.error('Error URL:', error.url);
  //       return of([]);
  //     })
  //   );
  // }

  getTransactions(timeFrame: string, limit: number = 10, page: number = 1): Observable<Transaction[]> {
    console.log('🔍 getTransactions called with:', { timeFrame, limit, page });

    const userId = this.userId;
    console.log('📝 User ID:', userId);

    if (!userId) {
      console.error('❌ No user ID found! User may not be authenticated.');
      return of([]); // Return empty, will fallback to mock
    }

    const params = new HttpParams()
      .set('timeFrame', timeFrame)
      .set('limit', limit.toString())
      .set('page', page.toString());

    const url = `${this.apiUrl}/users/${userId}/transactions`;
    console.log('🌐 API URL:', url);
    console.log('📋 Params:', params.toString());

    return this.http.get<Transaction[]>(url,
      {
        params: params,
        withCredentials: true,
      }
    ).pipe(
      map(transactions => {
        console.log('✅ Backend Response:', transactions);
        const mapped = this.mapTransactions(transactions);
        console.log('🗺️ Mapped Transactions:', mapped);
        return mapped;
      }),
      catchError(error => {
        console.error('❌ Error fetching transactions:', error);
        console.error('Error Status:', error.status);
        console.error('Error Message:', error.message);
        console.error('Error URL:', error.url);
        return of([]);
      })
    );
  }
  // Get financial summary
  getTransactionSummary(timeFrame: string): Observable<TransactionSummary> {
    console.log('🔍 getTransactionSummary called with:', timeFrame);

    const userId = this.userId;

    if (!userId) {
      console.error('❌ No user ID for summary');
      return of(this.getMockSummary(timeFrame));
    }

    const params = new HttpParams().set('timeFrame', timeFrame);
    const url = `${this.apiUrl}/users/${userId}/transactions/summary`;
    console.log('🌐 Summary URL:', url);

    return this.http.get<TransactionSummary>(url, this.getRequestOptions(params)).pipe(
      map(summary => {
        console.log('✅ Summary Response:', summary);
        return this.mapSummary(summary, timeFrame);
      }),
      catchError(error => {
        console.error('❌ Error fetching summary:', error);
        return of(this.getMockSummary(timeFrame));
      })
    );
  }

  // Get category breakdown
  getCategorySummary(timeFrame: string): Observable<CategorySummary[]> {
    console.log('🔍 getCategorySummary called with:', timeFrame);

    const userId = this.userId;

    if (!userId) {
      console.error('❌ No user ID for categories');
      return of(this.getMockCategories(timeFrame));
    }

    const params = new HttpParams().set('timeFrame', timeFrame);
    const url = `${this.apiUrl}/users/${userId}/transactions/categories/summary`;
    console.log('🌐 Categories URL:', url);

    return this.http.get<CategorySummary[]>(url, this.getRequestOptions(params)).pipe(
      map(categories => {
        console.log('✅ Categories Response:', categories);
        return this.mapCategories(categories);
      }),
      catchError(error => {
        console.error('❌ Error fetching categories:', error);
        return of(this.getMockCategories(timeFrame));
      })
    );
  }

  // Get detailed category statistics
  getCategoryStats(timeFrame: string): Observable<CategoryStatsResponse> {
    const userId = this.userId;
    const params = new HttpParams().set('timeFrame', timeFrame);

    return this.http.get<CategoryStatsResponse>(
      `${this.apiUrl}/users/${userId}/transactions/categories/stats`,
      this.getRequestOptions(params)
    ).pipe(
      map(response => response),
      catchError(error => {
        console.error('Error fetching category stats:', error);
        return of(this.getMockCategoryStats(timeFrame));
      })
    );
  }

  // Add new transaction
  addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Observable<Transaction> {
    const userId = this.userId;
    return this.http.post<Transaction>(
      `${this.apiUrl}/users/${userId}/transactions`,
      transaction,
      this.getRequestOptions()
    );
  }

  // Update transaction
  updateTransaction(id: string, type: string, transaction: Partial<Transaction>): Observable<Transaction> {
    const userId = this.userId;
    const params = new HttpParams().set('type', type);

    return this.http.put<Transaction>(
      `${this.apiUrl}/users/${userId}/transactions/${id}`,
      transaction,
      this.getRequestOptions(params)
    );
  }

  // Delete transaction
  deleteTransaction(id: string, type: string): Observable<void> {
    const userId = this.userId;
    const params = new HttpParams().set('type', type);

    return this.http.delete<void>(
      `${this.apiUrl}/users/${userId}/transactions/${id}`,
      this.getRequestOptions(params)
    );
  }

  // Get recent transactions (using backend endpoint)
  getRecentTransactions(limit: number = 5): Observable<Transaction[]> {
    const userId = this.userId;
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<Transaction[]>(
      `${this.apiUrl}/users/${userId}/transactions/recent`,
      this.getRequestOptions(params)
    ).pipe(
      map(transactions => this.mapTransactions(transactions)),
      catchError(error => {
        console.error('Error fetching recent transactions:', error);
        return of([]);
      })
    );
  }

  // Get expenses only
  getExpenses(timeFrame: string, limit: number = 10, page: number = 1): Observable<Transaction[]> {
    const userId = this.userId;
    const params = new HttpParams()
      .set('timeFrame', timeFrame)
      .set('limit', limit.toString())
      .set('page', page.toString());

    return this.http.get<Transaction[]>(
      `${this.apiUrl}/users/${userId}/expenses`,
      this.getRequestOptions(params)
    ).pipe(
      map(transactions => this.mapTransactions(transactions)),
      catchError(error => {
        console.error('Error fetching expenses:', error);
        return of([]);
      })
    );
  }

  // Get revenues only
  getRevenues(timeFrame: string, limit: number = 10, page: number = 1): Observable<Transaction[]> {
    const userId = this.userId;
    const params = new HttpParams()
      .set('timeFrame', timeFrame)
      .set('limit', limit.toString())
      .set('page', page.toString());

    return this.http.get<Transaction[]>(
      `${this.apiUrl}/users/${userId}/revenues`,
      this.getRequestOptions(params)
    ).pipe(
      map(transactions => this.mapTransactions(transactions)),
      catchError(error => {
        console.error('Error fetching revenues:', error);
        return of([]);
      })
    );
  }

  // Generate report
  generateReport(reportData: ReportData): Observable<Blob> {
    return this.http.post(`${this.getBaseUrl()}/reports/generate`, reportData, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      responseType: 'blob',
      withCredentials: true
    });
  }

  // Get expense report
  getExpenseReport(startDate: string, endDate: string): Observable<ExpenseReport[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ExpenseReport[]>(`${this.getBaseUrl()}/reports/expense`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      params,
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error fetching expense report:', error);
        return of([]);
      })
    );
  }

  // Get income statement
  getIncomeStatement(startDate: string, endDate: string): Observable<IncomeStatement> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<IncomeStatement>(`${this.getBaseUrl()}/reports/income-statement`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      params,
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error fetching income statement:', error);
        return of(this.getMockIncomeStatement());
      })
    );
  }

  // Get trend analysis
  getTrendAnalysis(timeFrame: 'monthly' | 'quarterly' | 'yearly'): Observable<TrendAnalysis[]> {
    const params = new HttpParams().set('timeFrame', timeFrame);

    return this.http.get<TrendAnalysis[]>(`${this.getBaseUrl()}/analysis/trend`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      params,
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error fetching trend analysis:', error);
        return of(this.getMockTrendAnalysis(timeFrame));
      })
    );
  }

  // Get budget vs actual
  getBudgetVsActual(): Observable<any> {
    return this.http.get<any>(`${this.getBaseUrl()}/analysis/budget-vs-actual`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error fetching budget vs actual:', error);
        return of(this.getMockBudgetVsActual());
      })
    );
  }

  // ========== MAPPING METHODS ==========

  private mapTransactions(data: any): Transaction[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: item.id?.toString() || '',
      amount: Number(item.amount) || 0,
      type: this.normalizeTransactionType(item.type),
      category: item.category || 'Uncategorized',
      description: item.description || '',
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
    }));
  }

  private mapSummary(data: any, timeFrame: string): TransactionSummary {
    if (!data) return this.getMockSummary(timeFrame);

    return {
      totalExpenses: Number(data.totalExpenses) || 0,
      totalRevenue: Number(data.totalRevenue) || 0,
      expenseCount: Number(data.expenseCount) || 0,
      revenueCount: Number(data.revenueCount) || 0,
      netAmount: Number(data.netAmount) || 0,
      period: timeFrame,
      currency: data.currency || 'USD'
    };
  }

  private mapCategories(data: any): CategorySummary[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      category: item.category || 'Unknown',
      amount: Number(item.amount) || 0,
      type: this.normalizeTransactionType(item.type),
      percentage: Number(item.percentage) || 0
    }));
  }

  private normalizeTransactionType(type: string): 'expense' | 'revenue' {
    if (!type) return 'expense';
    const normalized = type.toLowerCase().trim();
    return (normalized === 'expense' || normalized === 'revenue')
      ? normalized
      : 'expense';
  }

  // ========== MOCK DATA FALLBACKS ==========
  private getMockSummary(timeFrame: string): TransactionSummary {
    return {
      totalExpenses: 425,
      totalRevenue: 3500,
      expenseCount: 3,
      revenueCount: 2,
      netAmount: 3075,
      period: timeFrame,
      currency: 'USD',
    };
  }

  private getMockCategories(timeFrame: string): CategorySummary[] {
    return [
      { category: 'Food', amount: 150, type: 'expense', percentage: 35.3 },
      { category: 'Transport', amount: 200, type: 'expense', percentage: 47.1 },
      { category: 'Entertainment', amount: 75, type: 'expense', percentage: 17.6 },
      { category: 'Salary', amount: 3000, type: 'revenue', percentage: 85.7 },
      { category: 'Freelance', amount: 500, type: 'revenue', percentage: 14.3 }
    ];
  }

  private getMockCategoryStats(timeFrame: string): CategoryStatsResponse {
    return {
      expenseCategories: [
        {
          category: 'Food',
          type: 'expense',
          totalAmount: 825,
          transactionCount: 6,
          averageAmount: 137.5,
          percentage: 32.5,
          trend: 'up',
          trendPercentage: 5.2,
          monthlyData: [
            { month: 'Jan', amount: 270, transactionCount: 2 },
            { month: 'Feb', amount: 220, transactionCount: 1 },
            { month: 'Mar', amount: 95, transactionCount: 1 },
            { month: 'Apr', amount: 240, transactionCount: 2 }
          ]
        }
      ],
      revenueCategories: [
        {
          category: 'Salary',
          type: 'revenue',
          totalAmount: 11200,
          transactionCount: 4,
          averageAmount: 2800,
          percentage: 74.7,
          trend: 'stable',
          trendPercentage: 0,
          monthlyData: [
            { month: 'Jan', amount: 3000, transactionCount: 1 },
            { month: 'Feb', amount: 2500, transactionCount: 1 },
            { month: 'Mar', amount: 2800, transactionCount: 1 },
            { month: 'Apr', amount: 2900, transactionCount: 1 }
          ]
        }
      ],
      timeFrame: timeFrame,
      summary: {
        totalExpenses: 2540,
        totalRevenue: 15000,
        averageTransaction: 625,
        mostSpentCategory: 'Food',
        mostRevenueCategory: 'Salary'
      }
    };
  }

  private getMockIncomeStatement(): IncomeStatement {
    return {
      totalRevenue: 15000,
      totalExpenses: 2540,
      netIncome: 12460,
      grossMargin: 83.1,
      categories: {
        revenue: [
          { name: 'Salary', amount: 11200, percentage: 74.7 },
          { name: 'Freelance', amount: 1450, percentage: 9.7 },
          { name: 'Investment', amount: 1070, percentage: 7.1 },
          { name: 'Gift', amount: 750, percentage: 5.0 },
          { name: 'Other', amount: 530, percentage: 3.5 }
        ],
        expenses: [
          { name: 'Food', amount: 825, percentage: 32.5 },
          { name: 'Transport', amount: 530, percentage: 20.9 },
          { name: 'Entertainment', amount: 395, percentage: 15.6 },
          { name: 'Bills', amount: 360, percentage: 14.2 },
          { name: 'Shopping', amount: 360, percentage: 14.2 },
          { name: 'Healthcare', amount: 240, percentage: 9.5 },
          { name: 'Other', amount: 120, percentage: 4.7 }
        ]
      }
    };
  }

  private getMockTrendAnalysis(timeFrame: 'monthly' | 'quarterly' | 'yearly'): TrendAnalysis[] {
    if (timeFrame === 'monthly') {
      return [
        { period: 'Jan 2024', totalAmount: 3875, percentageChange: 0, trend: 'stable' },
        { period: 'Feb 2024', totalAmount: 4230, percentageChange: 9.2, trend: 'up' },
        { period: 'Mar 2024', totalAmount: 3785, percentageChange: -10.5, trend: 'down' },
        { period: 'Apr 2024', totalAmount: 4150, percentageChange: 9.6, trend: 'up' }
      ];
    } else if (timeFrame === 'quarterly') {
      return [
        { period: 'Q1 2024', totalAmount: 11890, percentageChange: 5.2, trend: 'up' },
        { period: 'Q2 2024', totalAmount: 8650, percentageChange: -27.2, trend: 'down' }
      ];
    } else {
      return [
        { period: '2022', totalAmount: 45200, percentageChange: 8.5, trend: 'up' },
        { period: '2023', totalAmount: 49850, percentageChange: 10.3, trend: 'up' },
        { period: '2024', totalAmount: 20540, percentageChange: 12.7, trend: 'up', forecast: 56000 }
      ];
    }
  }

  private getMockBudgetVsActual(): any {
    return {
      categories: [
        { name: 'Food', budget: 1000, actual: 825, variance: 175, variancePercent: 17.5 },
        { name: 'Transport', budget: 600, actual: 530, variance: 70, variancePercent: 11.7 },
        { name: 'Entertainment', budget: 400, actual: 395, variance: 5, variancePercent: 1.3 }
      ],
      total: {
        budget: 2900,
        actual: 2710,
        variance: 190,
        variancePercent: 6.6
      }
    };
  }
}
