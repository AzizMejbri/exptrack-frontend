// reports.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { TransactionService, ExpenseReport, IncomeStatement, TrendAnalysis, ReportData, CategoryBreakdown } from '../services/transaction.service';
import { ThemeService } from '../theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {
  // Report types
  reportTypes = [
    { id: 'expense', name: 'Expense Report', icon: '💰' },
    { id: 'income', name: 'Income Statement', icon: '📊' },
    { id: 'trend', name: 'Trend Analysis', icon: '📈' },
    { id: 'budget', name: 'Budget vs Actual', icon: '🎯' },
    { id: 'custom', name: 'Custom Report', icon: '📋' }
  ];

  // Time periods
  timePeriods = [
    { id: 'last30', name: 'Last 30 Days' },
    { id: 'last90', name: 'Last 90 Days' },
    { id: 'last365', name: 'Last 365 Days' },
    { id: 'currentMonth', name: 'Current Month' },
    { id: 'currentQuarter', name: 'Current Quarter' },
    { id: 'currentYear', name: 'Current Year' },
    { id: 'custom', name: 'Custom Range' }
  ];

  // Export formats
  exportFormats = [
    { id: 'pdf', name: 'PDF Document', icon: '📄' },
    { id: 'csv', name: 'CSV Spreadsheet', icon: '📊' },
    { id: 'excel', name: 'Excel Workbook', icon: '📈' },
    { id: 'json', name: 'JSON Data', icon: '💾' }
  ];

  // State variables
  selectedReport = 'expense';
  selectedPeriod = 'currentMonth';
  exportFormat = 'pdf';
  startDate = '';
  endDate = '';
  isLoading = false;
  isDarkMode = false;
  showCustomDateRange = false;

  // Report data
  expenseReport: ExpenseReport[] = [];
  incomeStatement: IncomeStatement | null = null;
  trendAnalysis: TrendAnalysis[] = [];
  budgetVsActual: any = null;

  // Chart data
  expenseChartData: any[] = [];
  incomeChartData: any = null;
  trendChartData: any = null;

  private themeSubscription!: Subscription;

  constructor(
    private transactionService: TransactionService,
    private themeService: ThemeService
  ) { }

  ngOnInit() {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );

    // Set default date range
    this.setDefaultDateRange();
    this.loadReport();
  }

  setDefaultDateRange() {
    const today = new Date();
    const start = new Date();

    switch (this.selectedPeriod) {
      case 'last30':
        start.setDate(today.getDate() - 30);
        break;
      case 'last90':
        start.setDate(today.getDate() - 90);
        break;
      case 'last365':
        start.setDate(today.getDate() - 365);
        break;
      case 'currentMonth':
        start.setDate(1);
        break;
      case 'currentQuarter':
        const quarter = Math.floor((today.getMonth() + 3) / 3);
        start.setMonth((quarter - 1) * 3, 1);
        break;
      case 'currentYear':
        start.setMonth(0, 1);
        break;
    }

    this.startDate = start.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  onPeriodChange() {
    if (this.selectedPeriod === 'custom') {
      this.showCustomDateRange = true;
    } else {
      this.showCustomDateRange = false;
      this.setDefaultDateRange();
      this.loadReport();
    }
  }

  onDateRangeChange() {
    if (this.startDate && this.endDate) {
      this.loadReport();
    }
  }

  loadReport() {
    this.isLoading = true;

    switch (this.selectedReport) {
      case 'expense':
        this.loadExpenseReport();
        break;
      case 'income':
        this.loadIncomeStatement();
        break;
      case 'trend':
        this.loadTrendAnalysis();
        break;
      case 'budget':
        this.loadBudgetVsActual();
        break;
      default:
        this.isLoading = false;
    }
  }

  loadExpenseReport() {
    this.transactionService.getExpenseReport(this.startDate, this.endDate).subscribe({
      next: (data) => {
        this.expenseReport = data;
        this.prepareExpenseChartData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading expense report:', error);
        this.expenseReport = this.getMockExpenseData();
        this.prepareExpenseChartData();
        this.isLoading = false;
      }
    });
  }

  loadIncomeStatement() {
    this.transactionService.getIncomeStatement(this.startDate, this.endDate).subscribe({
      next: (data) => {
        this.incomeStatement = data;
        this.prepareIncomeChartData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading income statement:', error);
        this.incomeStatement = this.getMockIncomeData();
        this.prepareIncomeChartData();
        this.isLoading = false;
      }
    });
  }

  loadTrendAnalysis() {
    const timeFrame = this.selectedPeriod.includes('Month') ? 'monthly' :
      this.selectedPeriod.includes('Quarter') ? 'quarterly' : 'yearly';

    this.transactionService.getTrendAnalysis(timeFrame).subscribe({
      next: (data) => {
        this.trendAnalysis = data;
        this.prepareTrendChartData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading trend analysis:', error);
        this.trendAnalysis = this.getMockTrendData();
        this.prepareTrendChartData();
        this.isLoading = false;
      }
    });
  }

  loadBudgetVsActual() {
    this.transactionService.getBudgetVsActual().subscribe({
      next: (data) => {
        this.budgetVsActual = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading budget vs actual:', error);
        this.budgetVsActual = this.getMockBudgetData();
        this.isLoading = false;
      }
    });
  }

  prepareExpenseChartData() {
    this.expenseChartData = this.expenseReport.map(item => ({
      name: item.category,
      value: item.totalAmount,
      percentage: item.percentage
    }));
  }

  prepareIncomeChartData() {
    if (!this.incomeStatement) return;

    this.incomeChartData = {
      revenue: this.incomeStatement.categories.revenue.map(item => ({
        name: item.name,
        value: item.amount,
        percentage: item.percentage
      })),
      expenses: this.incomeStatement.categories.expenses.map(item => ({
        name: item.name,
        value: item.amount,
        percentage: item.percentage
      }))
    };
  }

  prepareTrendChartData() {
    this.trendChartData = this.trendAnalysis.map(item => ({
      period: item.period,
      amount: item.totalAmount,
      change: item.percentageChange,
      trend: item.trend
    }));
  }

  exportReport() {
    this.isLoading = true;

    // Create report data with proper types
    const reportData: ReportData = {
      type: 'all', // Since we're using mock data, we'll just use 'all'
      startDate: this.startDate,
      endDate: this.endDate,
      format: 'json' as 'pdf' | 'csv' | 'json' // Cast to the correct type
    };

    this.transactionService.generateReport(reportData).subscribe({
      next: (blob) => {
        const filename = this.getExportFilename();
        saveAs(blob, filename);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error exporting report:', error);
        this.isLoading = false;
        // Fallback: Download as JSON
        this.downloadAsJSON();
      }
    });
  }
  getExportFilename(): string {
    const date = new Date().toISOString().split('T')[0];
    const reportName = this.reportTypes.find(r => r.id === this.selectedReport)?.name || 'Report';
    return `${reportName.replace(/\s+/g, '_')}_${date}.${this.exportFormat}`;
  }

  downloadAsJSON() {
    const data = this.getCurrentReportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const filename = this.getExportFilename();
    saveAs(blob, filename);
  }

  getCurrentReportData(): any {
    switch (this.selectedReport) {
      case 'expense':
        return {
          reportType: 'Expense Report',
          period: `${this.startDate} to ${this.endDate}`,
          data: this.expenseReport,
          generatedAt: new Date().toISOString()
        };
      case 'income':
        return {
          reportType: 'Income Statement',
          period: `${this.startDate} to ${this.endDate}`,
          data: this.incomeStatement,
          generatedAt: new Date().toISOString()
        };
      case 'trend':
        return {
          reportType: 'Trend Analysis',
          period: this.selectedPeriod,
          data: this.trendAnalysis,
          generatedAt: new Date().toISOString()
        };
      default:
        return { message: 'No data available' };
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Food': '🍔',
      'Transport': '🚗',
      'Entertainment': '🎬',
      'Shopping': '🛍️',
      'Bills': '🧾',
      'Healthcare': '🏥',
      'Education': '📚',
      'Travel': '✈️',
      'Salary': '💰',
      'Freelance': '💼',
      'Investment': '📈',
      'Gift': '🎁',
      'Other': '📦'
    };
    return icons[category] || '📊';
  }

  getTrendIcon(trend: string): string {
    return {
      'up': '📈',
      'down': '📉',
      'stable': '➡️'
    }[trend] || '📊';
  }

  // Mock data methods (for development)
  private getMockExpenseData(): ExpenseReport[] {
    return [
      {
        category: 'Food',
        totalAmount: 1250.50,
        transactionCount: 45,
        averageAmount: 27.79,
        percentage: 32.5,
        monthlyBreakdown: [
          { month: 'Jan', amount: 400, percentage: 32 },
          { month: 'Feb', amount: 425, percentage: 34 },
          { month: 'Mar', amount: 425.5, percentage: 34 }
        ]
      },
      {
        category: 'Transport',
        totalAmount: 850.75,
        transactionCount: 22,
        averageAmount: 38.67,
        percentage: 22.1,
        monthlyBreakdown: [
          { month: 'Jan', amount: 280, percentage: 33 },
          { month: 'Feb', amount: 285, percentage: 33.5 },
          { month: 'Mar', amount: 285.75, percentage: 33.5 }
        ]
      },
      {
        category: 'Entertainment',
        totalAmount: 620.25,
        transactionCount: 15,
        averageAmount: 41.35,
        percentage: 16.1,
        monthlyBreakdown: [
          { month: 'Jan', amount: 200, percentage: 32.2 },
          { month: 'Feb', amount: 210, percentage: 33.9 },
          { month: 'Mar', amount: 210.25, percentage: 33.9 }
        ]
      }
    ];
  }

  private getMockIncomeData(): IncomeStatement {
    return {
      totalRevenue: 12500,
      totalExpenses: 3860,
      netIncome: 8640,
      grossMargin: 69.1,
      categories: {
        revenue: [
          { name: 'Salary', amount: 10000, percentage: 80 },
          { name: 'Freelance', amount: 2000, percentage: 16 },
          { name: 'Investments', amount: 500, percentage: 4 }
        ],
        expenses: [
          { name: 'Food', amount: 1250, percentage: 32.4 },
          { name: 'Transport', amount: 850, percentage: 22 },
          { name: 'Entertainment', amount: 620, percentage: 16.1 },
          { name: 'Bills', amount: 1140, percentage: 29.5 }
        ]
      }
    };
  }

  private getMockTrendData(): TrendAnalysis[] {
    return [
      { period: 'Jan', totalAmount: 3200, percentageChange: 5.2, trend: 'up' },
      { period: 'Feb', totalAmount: 3450, percentageChange: 7.8, trend: 'up' },
      { period: 'Mar', totalAmount: 3860, percentageChange: 11.9, trend: 'up' },
      { period: 'Apr', totalAmount: 3650, percentageChange: -5.4, trend: 'down' },
      { period: 'May', totalAmount: 3820, percentageChange: 4.7, trend: 'up' },
      { period: 'Jun', totalAmount: 3950, percentageChange: 3.4, trend: 'up' }
    ];
  }

  private getMockBudgetData(): any {
    return {
      categories: [
        { name: 'Food', budget: 1200, actual: 1250, variance: -50, variancePercent: -4.2 },
        { name: 'Transport', budget: 800, actual: 850, variance: -50, variancePercent: -6.3 },
        { name: 'Entertainment', budget: 600, actual: 620, variance: -20, variancePercent: -3.3 },
        { name: 'Bills', budget: 1100, actual: 1140, variance: -40, variancePercent: -3.6 }
      ],
      total: {
        budget: 3700,
        actual: 3860,
        variance: -160,
        variancePercent: -4.3
      }
    };
  }
  // Add to reports.component.ts
  getTotalExpenses(): number {
    return this.expenseReport.reduce((sum, item) => sum + item.totalAmount, 0);
  }

  getAverageExpense(): number {
    const total = this.getTotalExpenses();
    return total / this.expenseReport.length || 0;
  }

  getTotalTransactions(): number {
    return this.expenseReport.reduce((sum, item) => sum + item.transactionCount, 0);
  }

  getCategoryColor(index: number): string {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#0ea5e9', '#3b82f6', '#8b5cf6'];
    return colors[index % colors.length];
  }

  getMaxTrendAmount(): number {
    return Math.max(...this.trendAnalysis.map(t => t.totalAmount), 1);
  }

  getOverallTrend(): string {
    const avgChange = this.getAverageTrendChange();
    if (avgChange > 2) return 'up';
    if (avgChange < -2) return 'down';
    return 'stable';
  }

  getAverageTrendChange(): number {
    if (this.trendAnalysis.length === 0) return 0;
    const sum = this.trendAnalysis.reduce((acc, t) => acc + t.percentageChange, 0);
    return sum / this.trendAnalysis.length;
  }

  getOverallTrendIcon(): string {
    return this.getTrendIcon(this.getOverallTrend());
  }

  getBestPeriod(): TrendAnalysis | null {
    if (this.trendAnalysis.length === 0) return null;
    return this.trendAnalysis.reduce((best, current) =>
      current.percentageChange > (best?.percentageChange || -Infinity) ? current : best
    );
  }

  getForecast(): number {
    if (this.trendAnalysis.length < 2) return 0;
    const last = this.trendAnalysis[this.trendAnalysis.length - 1];
    const avgGrowth = this.getAverageTrendChange();
    return last.totalAmount * (1 + avgGrowth / 100);
  }
  getRevenueCategories(): CategoryBreakdown[] {
    return this.incomeStatement?.categories?.revenue || [];
  }

  getExpenseCategories(): CategoryBreakdown[] {
    return this.incomeStatement?.categories?.expenses || [];
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
}
