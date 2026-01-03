import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Transaction, TransactionSummary, CategorySummary } from '../models/transaction.model';
import { AuthService } from '../auth/auth';
import { environment } from '../../environments/environment.prod';

// Define interfaces for reports
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
  // private apiUrl = 'https://localhost:8443/api';
  private apiUrl = environment.apiUrl;
  private userId: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {
    const currentUser = this.authService.getCurrentUser();
    this.userId = currentUser?.id || null;


    if (!this.userId) {
      console.warn('⚠️ WARNING: No user ID found. User not authenticated.');
    }
  }

  private getBaseUrl(): string {
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    return `${this.apiUrl}/users/${this.userId}/transactions`;
  }

  private getRequestOptions(params?: HttpParams): {
    headers: HttpHeaders;
    params?: HttpParams;
    withCredentials: boolean;
  } {
    return {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      ...(params && { params }),
      withCredentials: true
    };
  }

  checkAuth(): void {
    const currentUser = this.authService.getCurrentUser();
  }

  getTransactions(timeFrame: string, limit: number = 10, page: number = 1): Observable<Transaction[]> {

    const userId = this.userId;

    if (!userId) {
      console.error('❌ No user ID found! User may not be authenticated.');
      return of([]);
    }

    const params = new HttpParams()
      .set('timeFrame', timeFrame)
      .set('limit', limit.toString())
      .set('page', page.toString());

    const url = `${this.apiUrl}/users/${userId}/transactions`;
    console.log('🌐 API URL:', url);
    console.log('📋 Params:', params.toString());

    return this.http.get<any>(url, {
      params: params,
      withCredentials: true,
    }).pipe(
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

  getTransactionSummary(timeFrame: string): Observable<TransactionSummary> {
    console.log('🔍 getTransactionSummary called with:', timeFrame);

    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for summary');
      return of(this.getEmptySummary(timeFrame));
    }

    const params = new HttpParams().set('timeFrame', timeFrame);
    const url = `${this.apiUrl}/users/${userId}/transactions/summary`;
    console.log('🌐 Summary URL:', url);

    return this.http.get<any>(url, this.getRequestOptions(params)).pipe(
      map(summary => {
        console.log('✅ Summary Response:', summary);
        return this.mapSummary(summary, timeFrame);
      }),
      catchError(error => {
        console.error('❌ Error fetching summary:', error);
        return of(this.getEmptySummary(timeFrame));
      })
    );
  }

  getCategorySummary(timeFrame: string): Observable<CategorySummary[]> {
    console.log('🔍 getCategorySummary called with:', timeFrame);

    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for categories');
      return of([]);
    }

    const params = new HttpParams().set('timeFrame', timeFrame);
    const url = `${this.apiUrl}/users/${userId}/transactions/categories/summary`;
    console.log('🌐 Categories URL:', url);

    return this.http.get<any>(url, this.getRequestOptions(params)).pipe(
      map(categories => {
        console.log('✅ Categories Response:', categories);
        return this.mapCategories(categories);
      }),
      catchError(error => {
        console.error('❌ Error fetching categories:', error);
        return of([]);
      })
    );
  }

  getCategoryStats(timeFrame: string): Observable<CategoryStatsResponse> {

    console.log('🔍 getCategoryStats called with:', timeFrame);

    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for categoriy stats');
      return of(this.getEmptyCategoryStats(timeFrame));
    }

    const params = new HttpParams().set('timeFrame', timeFrame);
    const url = `${this.apiUrl}/users/${userId}/transactions/categories/stats`;
    console.log('🌐 Categories URL:', url);

    return this.http.get<CategoryStatsResponse>(url, this.getRequestOptions(params)).pipe(
      map(categories => {
        console.log('✅ Categories Response:', categories);
        return categories;
      }),
      catchError(error => {
        console.error('❌ Error fetching categories:', error);
        return of(this.getEmptyCategoryStats(timeFrame));
      })
    );
    // const userId = this.userId;
    // if (!userId) {
    //   console.error('❌ No user ID for category stats');
    //   return of(this.getEmptyCategoryStats(timeFrame));
    // }
    //
    // const params = new HttpParams().set('timeFrame', timeFrame);
    // return this.http.get<CategoryStatsResponse>(
    //   `${this.apiUrl}/users/${userId}/transactions/categories/stats`,
    //   this.getRequestOptions(params)
    // ).pipe(
    //   map(response => response),
    //   catchError(error => {
    //     console.error('❌ Error fetching category stats:', error);
    //     return of(this.getEmptyCategoryStats(timeFrame));
    //   })
    // );
  }

  addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Observable<Transaction> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for adding transaction');
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.post<Transaction>(
      `${this.apiUrl}/users/${userId}/transactions`,
      transaction,
      this.getRequestOptions()
    ).pipe(
      catchError(error => {
        console.error('❌ Error adding transaction:', error);
        return throwError(() => error);
      })
    );
  }

  updateTransaction(id: string, type: string, transaction: Partial<Transaction>): Observable<Transaction> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for updating transaction');
      return throwError(() => new Error('User not authenticated'));
    }

    const params = new HttpParams().set('type', type);
    return this.http.put<Transaction>(
      `${this.apiUrl}/users/${userId}/transactions/${id}`,
      transaction,
      this.getRequestOptions(params)
    ).pipe(
      catchError(error => {
        console.error('❌ Error updating transaction:', error);
        return throwError(() => error);
      })
    );
  }

  deleteTransaction(id: string, type: string): Observable<void> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for deleting transaction');
      return throwError(() => new Error('User not authenticated'));
    }

    const params = new HttpParams().set('type', type);
    return this.http.delete<void>(
      `${this.apiUrl}/users/${userId}/transactions/${id}`,
      this.getRequestOptions(params)
    ).pipe(
      catchError(error => {
        console.error('❌ Error deleting transaction:', error);
        return throwError(() => error);
      })
    );
  }

  getRecentTransactions(limit: number = 5): Observable<Transaction[]> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for recent transactions');
      return of([]);
    }

    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any>(
      `${this.apiUrl}/users/${userId}/transactions/recent`,
      this.getRequestOptions(params)
    ).pipe(
      map(transactions => this.mapTransactions(transactions)),
      catchError(error => {
        console.error('❌ Error fetching recent transactions:', error);
        return of([]);
      })
    );
  }

  getExpenses(timeFrame: string, limit: number = 10, page: number = 1): Observable<Transaction[]> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for expenses');
      return of([]);
    }

    const params = new HttpParams()
      .set('timeFrame', timeFrame)
      .set('limit', limit.toString())
      .set('page', page.toString());

    return this.http.get<any>(
      `${this.apiUrl}/users/${userId}/expenses`,
      this.getRequestOptions(params)
    ).pipe(
      map(transactions => this.mapTransactions(transactions)),
      catchError(error => {
        console.error('❌ Error fetching expenses:', error);
        return of([]);
      })
    );
  }

  getRevenues(timeFrame: string, limit: number = 10, page: number = 1): Observable<Transaction[]> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for revenues');
      return of([]);
    }

    const params = new HttpParams()
      .set('timeFrame', timeFrame)
      .set('limit', limit.toString())
      .set('page', page.toString());

    return this.http.get<any>(
      `${this.apiUrl}/users/${userId}/revenues`,
      this.getRequestOptions(params)
    ).pipe(
      map(transactions => this.mapTransactions(transactions)),
      catchError(error => {
        console.error('❌ Error fetching revenues:', error);
        return of([]);
      })
    );
  }
  // ========== UPDATED REPORT METHODS ==========

  getExpenseReport(startDate: string, endDate: string): Observable<ExpenseReport[]> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for expense report');
      return of([]);
    }

    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    // FIXED: Correct URL matches backend endpoint
    const url = `${this.apiUrl}/users/${userId}/transactions/reports/expense`;
    console.log('🌐 Expense Report URL:', url);
    console.log('📋 Params:', params.toString());

    return this.http.get<ExpenseReport[]>(url, {
      params: params,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('✅ Expense Report Response:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error fetching expense report:', error);
        console.error('Error Status:', error.status);
        console.error('Error Message:', error.message);
        return of([]);
      })
    );
  }

  getIncomeStatement(startDate: string, endDate: string): Observable<IncomeStatement> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for income statement');
      return of(this.getEmptyIncomeStatement());
    }

    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    // FIXED: Correct URL matches backend endpoint
    const url = `${this.apiUrl}/users/${userId}/transactions/reports/income-statement`;
    console.log('🌐 Income Statement URL:', url);

    return this.http.get<IncomeStatement>(url, {
      params: params,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('✅ Income Statement Response:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error fetching income statement:', error);
        return of(this.getEmptyIncomeStatement());
      })
    );
  }

  getTrendAnalysis(timeFrame: 'monthly' | 'quarterly' | 'yearly'): Observable<TrendAnalysis[]> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for trend analysis');
      return of([]);
    }

    const params = new HttpParams().set('timeFrame', timeFrame);

    // FIXED: Correct URL matches backend endpoint
    const url = `${this.apiUrl}/users/${userId}/transactions/analysis/trend`;
    console.log('🌐 Trend Analysis URL:', url);

    return this.http.get<TrendAnalysis[]>(url, {
      params: params,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('✅ Trend Analysis Response:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error fetching trend analysis:', error);
        return of([]);
      })
    );
  }

  getBudgetVsActual(timeFrame: string = 'month'): Observable<any> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for budget vs actual');
      return of(this.getEmptyBudgetVsActual());
    }

    const params = new HttpParams().set('timeFrame', timeFrame);

    // FIXED: Correct URL matches backend endpoint
    const url = `${this.apiUrl}/users/${userId}/transactions/analysis/budget-vs-actual`;
    console.log('🌐 Budget vs Actual URL:', url);

    return this.http.get<any>(url, {
      params: params,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('✅ Budget vs Actual Response:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error fetching budget vs actual:', error);
        return of(this.getEmptyBudgetVsActual());
      })
    );
  }

  generateReport(reportData: ReportData): Observable<Blob> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for generating report');
      return throwError(() => new Error('User not authenticated'));
    }

    // FIXED: Correct URL matches backend endpoint
    const url = `${this.apiUrl}/users/${userId}/transactions/reports/generate`;
    console.log('🌐 Generate Report URL:', url);
    console.log('📤 Report Data:', reportData);

    return this.http.post(url, reportData, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      map(blob => {
        console.log('✅ Report generated successfully, blob size:', blob.size);
        return blob;
      }),
      catchError(error => {
        console.error('❌ Error generating report:', error);
        console.error('Error Status:', error.status);
        console.error('Error Message:', error.message);
        return throwError(() => error);
      })
    );
  }

  // ========== HELPER METHODS FOR REPORTS ==========

  // Get comprehensive custom report data (combines multiple endpoints)
  getCustomReport(startDate: string, endDate: string): Observable<any> {
    const userId = this.userId;
    if (!userId) {
      console.error('❌ No user ID for custom report');
      return of(null);
    }

    console.log('📊 Fetching custom report data...');

    // Fetch multiple report types in parallel
    return forkJoin({
      expenseReport: this.getExpenseReport(startDate, endDate),
      incomeStatement: this.getIncomeStatement(startDate, endDate),
      transactions: this.getTransactions('all', 1000, 1) // Get all transactions for detailed view
    }).pipe(
      map(({ expenseReport, incomeStatement, transactions }) => {
        // Filter transactions by date
        const filteredTransactions = transactions.filter(t => {
          const transDate = new Date(t.createdAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return transDate >= start && transDate <= end;
        });

        const expenses = filteredTransactions.filter(t => t.type === 'expense');
        const revenues = filteredTransactions.filter(t => t.type === 'revenue');

        return {
          summary: {
            totalExpenses: incomeStatement?.totalExpenses || 0,
            totalRevenue: incomeStatement?.totalRevenue || 0,
            netIncome: incomeStatement?.netIncome || 0,
            grossMargin: incomeStatement?.grossMargin || 0,
            period: `${startDate} to ${endDate}`
          },
          expenseReport: expenseReport || [],
          incomeStatement: incomeStatement || this.getEmptyIncomeStatement(),
          detailedData: {
            expenses: expenses.map(t => ({
              id: t.id,
              date: t.createdAt.toISOString().split('T')[0],
              category: t.category,
              description: t.description,
              amount: t.amount
            })),
            revenues: revenues.map(t => ({
              id: t.id,
              date: t.createdAt.toISOString().split('T')[0],
              category: t.category,
              description: t.description,
              amount: t.amount
            }))
          }
        };
      }),
      catchError(error => {
        console.error('❌ Error fetching custom report:', error);
        return of(null);
      })
    );
  }

  // Test all report endpoints
  testReportEndpoints(): Observable<any> {
    const testStartDate = '2024-01-01';
    const testEndDate = '2024-12-31';

    return forkJoin({
      trend: this.getTrendAnalysis('monthly'),
      expenseReport: this.getExpenseReport(testStartDate, testEndDate),
      incomeStatement: this.getIncomeStatement(testStartDate, testEndDate),
      budgetVsActual: this.getBudgetVsActual('month')
    }).pipe(
      map(results => {
        console.log('✅ All report endpoints tested successfully');
        return {
          success: true,
          results: {
            trendCount: results.trend.length,
            expenseReportCount: results.expenseReport.length,
            incomeStatement: !!results.incomeStatement,
            budgetVsActual: !!results.budgetVsActual
          }
        };
      }),
      catchError(error => {
        console.error('❌ Error testing report endpoints:', error);
        return of({
          success: false,
          error: error.message
        });
      })
    );
  }

  // ========== MAPPER METHODS FOR BACKEND RESPONSES ==========

  private mapExpenseReport(data: any): ExpenseReport[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      category: item.category || 'Uncategorized',
      totalAmount: Number(item.totalAmount) || 0,
      transactionCount: Number(item.transactionCount) || 0,
      averageAmount: Number(item.averageAmount) || 0,
      percentage: Number(item.percentage) || 0,
      monthlyBreakdown: this.mapMonthlyBreakdown(item.monthlyBreakdown)
    }));
  }

  private mapMonthlyBreakdown(data: any): MonthlyBreakdown[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      month: item.month || '',
      amount: Number(item.amount) || 0,
      percentage: Number(item.percentage) || 0
    }));
  }

  private mapIncomeStatement(data: any): IncomeStatement {
    if (!data) return this.getEmptyIncomeStatement();

    return {
      totalRevenue: Number(data.totalRevenue) || 0,
      totalExpenses: Number(data.totalExpenses) || 0,
      netIncome: Number(data.netIncome) || 0,
      grossMargin: Number(data.grossMargin) || 0,
      categories: {
        revenue: this.mapCategoryBreakdown(data.categories?.revenue),
        expenses: this.mapCategoryBreakdown(data.categories?.expenses)
      }
    };
  }

  private mapCategoryBreakdown(data: any): CategoryBreakdown[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      name: item.name || 'Unknown',
      amount: Number(item.amount) || 0,
      percentage: Number(item.percentage) || 0
    }));
  }

  private mapTrendAnalysis(data: any): TrendAnalysis[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      period: item.period || '',
      totalAmount: Number(item.totalAmount) || 0,
      percentageChange: Number(item.percentageChange) || 0,
      trend: this.normalizeTrend(item.trend),
      forecast: item.forecast ? Number(item.forecast) : undefined
    }));
  }

  private normalizeTrend(trend: string): 'up' | 'down' | 'stable' {
    if (!trend) return 'stable';
    const normalized = trend.toLowerCase().trim();
    if (normalized === 'up' || normalized === 'down' || normalized === 'stable') {
      return normalized;
    }
    return 'stable';
  }

  // ========== EMPTY DATA METHODS ==========
  private getEmptyIncomeStatement(): IncomeStatement {
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      grossMargin: 0,
      categories: {
        revenue: [],
        expenses: []
      }
    };
  }

  private getEmptyBudgetVsActual(): any {
    return {
      categories: [],
      total: {
        budget: 0,
        actual: 0,
        variance: 0,
        variancePercent: 0
      }
    };
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
    if (!data) return this.getEmptySummary(timeFrame);

    return {
      totalExpenses: Number(data.totalExpenses) || 0,
      totalRevenue: Number(data.totalRevenue) || 0,
      expenseCount: Number(data.expenseCount) || 0,
      revenueCount: Number(data.revenueCount) || 0,
      netAmount: Number(data.netAmount) || 0,
      period: timeFrame,
      currency: data.currency || 'TND'
    };
  }

  private mapCategories(data: any): CategorySummary[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      name: item.name || 'Unknown',
      amount: Number(item.amount) || 0,
      type: this.normalizeTransactionType(item.type),
      percentage: Number(item.percentage) || 0
    }));
  }

  private normalizeTransactionType(type: string): 'expense' | 'revenue' {
    if (!type) return 'expense';
    const normalized = type.toLowerCase().trim();
    return (normalized === 'expense' || normalized === 'revenue') ? normalized : 'expense';
  }

  // ========== EMPTY DATA METHODS ==========
  private getEmptySummary(timeFrame: string): TransactionSummary {
    return {
      totalExpenses: 0,
      totalRevenue: 0,
      expenseCount: 0,
      revenueCount: 0,
      netAmount: 0,
      period: timeFrame,
      currency: 'TND',
    };
  }

  private getEmptyCategoryStats(timeFrame: string): CategoryStatsResponse {
    return {
      expenseCategories: [],
      revenueCategories: [],
      timeFrame: timeFrame,
      summary: {
        totalExpenses: 0,
        totalRevenue: 0,
        averageTransaction: 0,
        mostSpentCategory: '',
        mostRevenueCategory: ''
      }
    };
  }

}
