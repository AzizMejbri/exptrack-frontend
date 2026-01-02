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
  exportFormat: 'pdf' | 'csv' | 'json' = 'pdf';
  startDate = '';
  endDate = '';
  isLoading = false;
  isDarkMode = false;
  showCustomDateRange = false;
  hasError = false;
  errorMessage = '';

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
    console.log('📊 Reports component initialized');

    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );

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

    console.log('📅 Date range set:', { startDate: this.startDate, endDate: this.endDate });
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
    console.log('📊 Loading report:', this.selectedReport);
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

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
    console.log('💰 Loading expense report:', { startDate: this.startDate, endDate: this.endDate });

    this.transactionService.getExpenseReport(this.startDate, this.endDate).subscribe({
      next: (data) => {
        console.log('✅ Expense report loaded:', data);
        this.expenseReport = data || [];
        this.prepareExpenseChartData();
        this.isLoading = false;

        if (this.expenseReport.length === 0) {
          this.errorMessage = 'No expense data available for the selected period.';
        }
      },
      error: (error) => {
        console.error('❌ Error loading expense report:', error);
        this.expenseReport = [];
        this.hasError = true;
        this.errorMessage = 'Failed to load expense report. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadIncomeStatement() {
    console.log('📊 Loading income statement:', { startDate: this.startDate, endDate: this.endDate });

    this.transactionService.getIncomeStatement(this.startDate, this.endDate).subscribe({
      next: (data) => {
        console.log('✅ Income statement loaded:', data);
        this.incomeStatement = data;
        this.prepareIncomeChartData();
        this.isLoading = false;

        if (!data || (data.totalExpenses === 0 && data.totalRevenue === 0)) {
          this.errorMessage = 'No income data available for the selected period.';
        }
      },
      error: (error) => {
        console.error('❌ Error loading income statement:', error);
        this.incomeStatement = null;
        this.hasError = true;
        this.errorMessage = 'Failed to load income statement. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadTrendAnalysis() {
    const timeFrame = this.selectedPeriod.includes('Month') ? 'monthly' :
      this.selectedPeriod.includes('Quarter') ? 'quarterly' : 'yearly';

    console.log('📈 Loading trend analysis:', timeFrame);

    this.transactionService.getTrendAnalysis(timeFrame).subscribe({
      next: (data) => {
        console.log('✅ Trend analysis loaded:', data);
        this.trendAnalysis = data || [];
        this.prepareTrendChartData();
        this.isLoading = false;

        if (this.trendAnalysis.length === 0) {
          this.errorMessage = 'No trend data available for the selected period.';
        }
      },
      error: (error) => {
        console.error('❌ Error loading trend analysis:', error);
        this.trendAnalysis = [];
        this.hasError = true;
        this.errorMessage = 'Failed to load trend analysis. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadBudgetVsActual() {
    console.log('🎯 Loading budget vs actual');

    this.transactionService.getBudgetVsActual().subscribe({
      next: (data) => {
        console.log('✅ Budget vs actual loaded:', data);
        this.budgetVsActual = data;
        this.isLoading = false;

        if (!data || (data.categories && data.categories.length === 0)) {
          this.errorMessage = 'No budget data available.';
        }
      },
      error: (error) => {
        console.error('❌ Error loading budget vs actual:', error);
        this.budgetVsActual = null;
        this.hasError = true;
        this.errorMessage = 'Failed to load budget comparison. Please try again.';
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
    console.log('📊 Expense chart data prepared:', this.expenseChartData);
  }

  prepareIncomeChartData() {
    if (!this.incomeStatement) {
      console.warn('⚠️ No income statement data for chart');
      return;
    }

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
    console.log('📊 Income chart data prepared:', this.incomeChartData);
  }

  prepareTrendChartData() {
    this.trendChartData = this.trendAnalysis.map(item => ({
      period: item.period,
      amount: item.totalAmount,
      change: item.percentageChange,
      trend: item.trend
    }));
    console.log('📊 Trend chart data prepared:', this.trendChartData);
  }

  exportReport() {
    console.log('📥 Exporting report:', {
      format: this.exportFormat,
      type: this.selectedReport
    });

    this.isLoading = true;

    const reportData: ReportData = {
      type: this.getReportType(),
      startDate: this.startDate,
      endDate: this.endDate,
      format: this.exportFormat
    };

    console.log('📋 Report data:', reportData);

    this.transactionService.generateReport(reportData).subscribe({
      next: (blob) => {
        console.log('✅ Report generated, downloading...');
        const filename = this.getExportFilename();
        saveAs(blob, filename);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error exporting report:', error);
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Failed to export report. Downloading as JSON fallback.';
        this.downloadAsJSON();
      }
    });
  }

  getReportType(): 'expense' | 'revenue' | 'all' {
    switch (this.selectedReport) {
      case 'expense':
        return 'expense';
      case 'income':
      case 'trend':
      case 'budget':
        return 'all';
      default:
        return 'all';
    }
  }

  getExportFilename(): string {
    const date = new Date().toISOString().split('T')[0];
    const reportName = this.reportTypes.find(r => r.id === this.selectedReport)?.name || 'Report';
    return `${reportName.replace(/\s+/g, '_')}_${date}.${this.exportFormat}`;
  }

  downloadAsJSON() {
    const data = this.getCurrentReportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const filename = this.getExportFilename().replace(/\.(pdf|csv|excel)$/, '.json');
    saveAs(blob, filename);
  }

  getCurrentReportData(): any {
    switch (this.selectedReport) {
      case 'expense':
        return {
          reportType: 'Expense Report',
          period: `${this.startDate} to ${this.endDate}`,
          data: this.expenseReport,
          summary: {
            totalExpenses: this.getTotalExpenses(),
            averageExpense: this.getAverageExpense(),
            totalTransactions: this.getTotalTransactions()
          },
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
          summary: {
            overallTrend: this.getOverallTrend(),
            averageChange: this.getAverageTrendChange(),
            forecast: this.getForecast()
          },
          generatedAt: new Date().toISOString()
        };
      case 'budget':
        return {
          reportType: 'Budget vs Actual',
          data: this.budgetVsActual,
          generatedAt: new Date().toISOString()
        };
      default:
        return {
          message: 'No data available',
          generatedAt: new Date().toISOString()
        };
    }
  }

  retryLoad(): void {
    console.log('🔄 Retrying report load...');
    this.loadReport();
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
