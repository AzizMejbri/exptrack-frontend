// reports.component.ts - Updated with SettingsService
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { TransactionService, TrendAnalysis, ReportData } from '../services/transaction.service';
import { ThemeService } from '../theme.service';
import { Subscription } from 'rxjs';
import { SettingsService } from '../services/settings.service';

interface CustomReportData {
  expenses: any[];
  revenues: any[];
  summary: {
    totalExpenses: number;
    totalRevenues: number;
    netIncome: number;
    period: string;
  };
}

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
    { id: 'trend', name: 'Trend Analysis', icon: '📈', description: 'Analyze spending trends over time' },
    { id: 'custom', name: 'Custom Report', icon: '📋', description: 'Export expenses and revenues' }
  ];

  // Time periods for trend analysis
  trendPeriods = [
    { id: 'monthly', name: 'Monthly View' },
    { id: 'quarterly', name: 'Quarterly View' },
    { id: 'yearly', name: 'Yearly View' }
  ];

  // Export formats
  exportFormats = [
    { id: 'pdf', name: 'PDF Document', icon: '📄' },
    { id: 'csv', name: 'CSV Spreadsheet', icon: '📊' },
    { id: 'json', name: 'JSON Data', icon: '💾' },
    { id: 'html', name: 'HTML Report', icon: '🌐' },
    { id: 'markdown', name: 'Markdown', icon: '📝' }
  ];

  // State variables
  selectedReport = 'trend';
  selectedTrendPeriod: 'monthly' | 'quarterly' | 'yearly' = 'monthly';
  exportFormat: 'pdf' | 'csv' | 'json' | 'html' | 'markdown' = 'pdf';
  startDate = '';
  endDate = '';
  isLoading = false;
  isDarkMode = false;
  showCustomDateRange = false;

  // Settings
  currentCurrency = 'USD';
  currentDateFormat = 'MM/DD/YYYY';
  appSettings: any;
  budgetSettings: any;

  // Report data
  trendAnalysis: TrendAnalysis[] = [];
  customReportData: CustomReportData | null = null;

  // Chart data
  trendChartData: any = null;

  private themeSubscription!: Subscription;
  private settingsSubscription!: Subscription;

  constructor(
    private transactionService: TransactionService,
    private themeService: ThemeService,
    private settingsService: SettingsService
  ) { }

  ngOnInit() {
    console.log('📊 Reports component initialized');

    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );

    // Subscribe to settings changes
    this.settingsSubscription = this.settingsService.appSettings$.subscribe(
      settings => {
        this.appSettings = settings;
        this.currentCurrency = settings.currency;
        this.currentDateFormat = settings.dateFormat;
        console.log('Reports - Settings updated:', settings);
      }
    );

    // Subscribe to budget settings changes
    this.settingsSubscription.add(
      this.settingsService.budgetSettings$.subscribe(
        settings => {
          this.budgetSettings = settings;
          console.log('Reports - Budget settings updated:', settings);
        }
      )
    );

    // Get initial settings
    this.appSettings = this.settingsService.getAppSettings();
    this.budgetSettings = this.settingsService.getBudgetSettings();
    this.currentCurrency = this.appSettings.currency;
    this.currentDateFormat = this.appSettings.dateFormat;

    this.setDefaultDateRange();
    this.loadReport();
  }

  setDefaultDateRange() {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 90);

    this.startDate = start.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  onReportTypeChange() {
    this.loadReport();
  }

  onTrendPeriodChange() {
    if (this.selectedReport === 'trend') {
      this.loadTrendAnalysis();
    }
  }

  onDateRangeChange() {
    if (this.startDate && this.endDate && this.selectedReport === 'custom') {
      this.loadCustomReport();
    }
  }

  loadReport() {
    console.log('📊 Loading report:', this.selectedReport);

    if (this.selectedReport === 'trend') {
      this.loadTrendAnalysis();
    } else if (this.selectedReport === 'custom') {
      this.loadCustomReport();
    }
  }

  loadTrendAnalysis() {
    console.log('📈 Loading trend analysis:', this.selectedTrendPeriod);
    this.isLoading = true;

    this.transactionService.getTrendAnalysis(this.selectedTrendPeriod).subscribe({
      next: (data) => {
        console.log('✅ Trend analysis loaded:', data);
        this.trendAnalysis = data || [];
        this.prepareTrendChartData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading trend analysis:', error);
        this.trendAnalysis = [];
        this.isLoading = false;
      }
    });
  }

  loadCustomReport() {
    console.log('📋 Loading custom report data');
    this.isLoading = true;

    // Use the new custom report method
    this.transactionService.getCustomReport(this.startDate, this.endDate).subscribe({
      next: (reportData) => {
        if (reportData) {
          this.customReportData = {
            expenses: reportData.detailedData?.expenses || [],
            revenues: reportData.detailedData?.revenues || [],
            summary: {
              totalExpenses: reportData.summary?.totalExpenses || 0,
              totalRevenues: reportData.summary?.totalRevenue || 0,
              netIncome: reportData.summary?.netIncome || 0,
              period: reportData.summary?.period || `${this.startDate} to ${this.endDate}`
            }
          };

          console.log('✅ Custom report loaded from backend:', this.customReportData);
        } else {
          // Fallback to client-side calculation
          console.warn('⚠️ No report data returned, using fallback');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading custom report:', error);
        // Fallback to client-side calculation
        this.isLoading = false;
      }
    });
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
    console.log('📥 Exporting report:', {
      format: this.exportFormat,
      type: this.selectedReport,
      currency: this.currentCurrency
    });

    if (this.selectedReport === 'trend') {
      this.exportTrendReport();
    } else {
      this.exportCustomReport();
    }
  }

  exportTrendReport() {
    const data = {
      reportType: 'Trend Analysis',
      period: this.selectedTrendPeriod,
      data: this.trendAnalysis,
      summary: {
        overallTrend: this.getOverallTrend(),
        averageChange: this.getAverageTrendChange(),
        forecast: this.getForecast()
      },
      currency: this.currentCurrency,
      generatedAt: new Date().toISOString(),
      settings: {
        currency: this.currentCurrency,
        dateFormat: this.currentDateFormat
      }
    };

    this.exportDataInFormat(data, 'Trend_Analysis');
  }

  exportCustomReport() {
    if (!this.customReportData) return;

    const data = {
      reportType: 'Custom Report',
      period: this.customReportData.summary.period,
      expenses: this.customReportData.expenses,
      revenues: this.customReportData.revenues,
      summary: this.customReportData.summary,
      currency: this.currentCurrency,
      generatedAt: new Date().toISOString(),
      settings: {
        currency: this.currentCurrency,
        dateFormat: this.currentDateFormat
      }
    };

    this.exportDataInFormat(data, 'Custom_Report');
  }

  exportDataInFormat(data: any, filename: string) {
    const date = new Date().toISOString().split('T')[0];
    let blob: Blob;
    let extension: string;

    switch (this.exportFormat) {
      case 'json':
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        extension = 'json';
        break;

      case 'csv':
        const csv = this.convertToCSV(data);
        blob = new Blob([csv], { type: 'text/csv' });
        extension = 'csv';
        break;

      case 'html':
        const html = this.convertToHTML(data);
        blob = new Blob([html], { type: 'text/html' });
        extension = 'html';
        break;

      case 'markdown':
        const markdown = this.convertToMarkdown(data);
        blob = new Blob([markdown], { type: 'text/markdown' });
        extension = 'md';
        break;

      case 'pdf':
        // For PDF, we'll use the API endpoint if available, otherwise fallback to JSON
        const reportData: ReportData = {
          type: 'all',
          startDate: this.startDate,
          endDate: this.endDate,
          format: 'pdf'
        };

        this.transactionService.generateReport(reportData).subscribe({
          next: (pdfBlob) => {
            saveAs(pdfBlob, `${filename}_${date}.pdf`);
          },
          error: () => {
            // Fallback to JSON if PDF generation fails
            blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            saveAs(blob, `${filename}_${date}.json`);
          }
        });
        return;
    }

    saveAs(blob, `${filename}_${date}.${extension}`);
  }

  convertToCSV(data: any): string {
    if (data.reportType === 'Trend Analysis') {
      let csv = 'Period,Amount,Change (%),Trend,Currency\n';
      data.data.forEach((item: any) => {
        csv += `${item.period},${item.totalAmount},${item.percentageChange},${item.trend},${data.currency}\n`;
      });
      return csv;
    } else {
      let csv = 'Type,Date,Category,Description,Amount,Currency\n';
      data.expenses.forEach((item: any) => {
        csv += `Expense,${item.date},${item.category},"${item.description}",${item.amount},${data.currency}\n`;
      });
      data.revenues.forEach((item: any) => {
        csv += `Revenue,${item.date},${item.category},"${item.description}",${item.amount},${data.currency}\n`;
      });
      return csv;
    }
  }

  convertToHTML(data: any): string {
    const style = `
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #667eea; margin-bottom: 8px; }
        .meta { color: #666; margin-bottom: 32px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .stat { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th { background: #667eea; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
        tr:hover { background: #f8f9fa; }
        .positive { color: #10b981; font-weight: bold; }
        .negative { color: #ef4444; font-weight: bold; }
        .report-info { background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #0ea5e9; }
        .currency-info { font-size: 12px; color: #666; font-style: italic; }
      </style>
    `;

    if (data.reportType === 'Trend Analysis') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Trend Analysis Report</title>
          ${style}
        </head>
        <body>
          <div class="container">
            <h1>📈 Trend Analysis Report</h1>
            <div class="meta">
              Period: ${data.period} | Generated: ${new Date(data.generatedAt).toLocaleString()}
              <div class="currency-info">Currency: ${data.currency} (${this.getCurrencySymbol()})</div>
            </div>

            <div class="summary">
              <div class="stat">
                <div class="stat-label">Overall Trend</div>
                <div class="stat-value">${this.getTrendIcon(data.summary.overallTrend)} ${data.summary.overallTrend}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Average Change</div>
                <div class="stat-value">${data.summary.averageChange.toFixed(1)}%</div>
              </div>
              <div class="stat">
                <div class="stat-label">Forecast</div>
                <div class="stat-value">${this.formatCurrency(data.summary.forecast)}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Change</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                ${data.data.map((item: any) => `
                  <tr>
                    <td>${item.period}</td>
                    <td>${this.formatCurrency(item.totalAmount)}</td>
                    <td class="${item.percentageChange >= 0 ? 'positive' : 'negative'}">
                      ${item.percentageChange > 0 ? '+' : ''}${item.percentageChange.toFixed(1)}%
                    </td>
                    <td>${this.getTrendIcon(item.trend)} ${item.trend}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Custom Financial Report</title>
          ${style}
        </head>
        <body>
          <div class="container">
            <h1>📋 Custom Financial Report</h1>
            <div class="meta">
              Period: ${data.summary.period} | Generated: ${new Date(data.generatedAt).toLocaleString()}
              <div class="currency-info">Currency: ${data.currency} (${this.getCurrencySymbol()})</div>
            </div>

            <div class="summary">
              <div class="stat">
                <div class="stat-label">Total Revenues</div>
                <div class="stat-value positive">${this.formatCurrency(data.summary.totalRevenues)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Total Expenses</div>
                <div class="stat-value negative">${this.formatCurrency(data.summary.totalExpenses)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Net Income</div>
                <div class="stat-value ${data.summary.netIncome >= 0 ? 'positive' : 'negative'}">
                  ${this.formatCurrency(data.summary.netIncome)}
                </div>
              </div>
            </div>

            <h2>💰 Revenues</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.revenues.map((item: any) => `
                  <tr>
                    <td>${this.formatDate(item.date)}</td>
                    <td>${item.category}</td>
                    <td>${item.description}</td>
                    <td class="positive">${this.formatCurrency(item.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h2>💸 Expenses</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.expenses.map((item: any) => `
                  <tr>
                    <td>${this.formatDate(item.date)}</td>
                    <td>${item.category}</td>
                    <td>${item.description}</td>
                    <td class="negative">${this.formatCurrency(item.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    }
  }

  convertToMarkdown(data: any): string {
    if (data.reportType === 'Trend Analysis') {
      let md = `# 📈 Trend Analysis Report\n\n`;
      md += `**Period:** ${data.period}  \n`;
      md += `**Generated:** ${new Date(data.generatedAt).toLocaleString()}  \n`;
      md += `**Currency:** ${data.currency} (${this.getCurrencySymbol()})\n\n`;
      md += `## Summary\n\n`;
      md += `- **Overall Trend:** ${this.getTrendIcon(data.summary.overallTrend)} ${data.summary.overallTrend}\n`;
      md += `- **Average Change:** ${data.summary.averageChange.toFixed(1)}%\n`;
      md += `- **Forecast:** ${this.formatCurrency(data.summary.forecast)}\n\n`;
      md += `## Detailed Analysis\n\n`;
      md += `| Period | Amount | Change | Trend |\n`;
      md += `|--------|--------|--------|-------|\n`;
      data.data.forEach((item: any) => {
        md += `| ${item.period} | ${this.formatCurrency(item.totalAmount)} | ${item.percentageChange > 0 ? '+' : ''}${item.percentageChange.toFixed(1)}% | ${this.getTrendIcon(item.trend)} ${item.trend} |\n`;
      });
      return md;
    } else {
      let md = `# 📋 Custom Financial Report\n\n`;
      md += `**Period:** ${data.summary.period}  \n`;
      md += `**Generated:** ${new Date(data.generatedAt).toLocaleString()}  \n`;
      md += `**Currency:** ${data.currency} (${this.getCurrencySymbol()})\n\n`;
      md += `## Summary\n\n`;
      md += `- **Total Revenues:** ${this.formatCurrency(data.summary.totalRevenues)}\n`;
      md += `- **Total Expenses:** ${this.formatCurrency(data.summary.totalExpenses)}\n`;
      md += `- **Net Income:** ${this.formatCurrency(data.summary.netIncome)}\n\n`;
      md += `## 💰 Revenues\n\n`;
      md += `| Date | Category | Description | Amount |\n`;
      md += `|------|----------|-------------|--------|\n`;
      data.revenues.forEach((item: any) => {
        md += `| ${this.formatDate(item.date)} | ${item.category} | ${item.description} | ${this.formatCurrency(item.amount)} |\n`;
      });
      md += `\n## 💸 Expenses\n\n`;
      md += `| Date | Category | Description | Amount |\n`;
      md += `|------|----------|-------------|--------|\n`;
      data.expenses.forEach((item: any) => {
        md += `| ${this.formatDate(item.date)} | ${item.category} | ${item.description} | ${this.formatCurrency(item.amount)} |\n`;
      });
      return md;
    }
  }

  // ===============================
  // FORMATTING METHODS (Using SettingsService)
  // ===============================

  formatCurrency(amount: number): string {
    // Use SettingsService for consistent currency formatting
    return this.settingsService.formatCurrency(amount);
  }

  formatDate(date: Date | string): string {
    // Use SettingsService for consistent date formatting
    return this.settingsService.formatDate(date);
  }

  getCurrencySymbol(): string {
    // Get currency symbol from SettingsService
    return this.settingsService.getCurrencySymbol();
  }

  getTrendIcon(trend: string): string {
    return {
      'up': '📈',
      'down': '📉',
      'stable': '➡️'
    }[trend] || '📊';
  }

  // ===============================
  // BUDGET-RELATED METHODS
  // ===============================

  // Check if budget alerts are enabled
  areBudgetAlertsEnabled(): boolean {
    return this.appSettings?.budgetAlerts &&
      this.budgetSettings?.enableBudgetAlerts;
  }

  // Get alert threshold
  getAlertThreshold(): number {
    return this.budgetSettings?.alertThreshold || 80;
  }

  // Get monthly budget
  getMonthlyBudget(): number {
    return this.budgetSettings?.monthlyBudget || 0;
  }

  // Calculate budget utilization for the custom report period
  calculateBudgetUtilization(): number {
    if (!this.customReportData || !this.budgetSettings) return 0;

    const totalExpenses = this.customReportData.summary.totalExpenses;
    const monthlyBudget = this.budgetSettings.monthlyBudget;

    if (monthlyBudget <= 0) return 0;

    // Calculate percentage of monthly budget used in the report period
    return (totalExpenses / monthlyBudget) * 100;
  }

  // ===============================
  // TREND ANALYSIS METHODS
  // ===============================

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

  // ===============================
  // UTILITY METHODS
  // ===============================

  // Get time frame label for display
  getTrendPeriodLabel(): string {
    const period = this.trendPeriods.find(p => p.id === this.selectedTrendPeriod);
    return period?.name || this.selectedTrendPeriod;
  }

  // Format period for display (e.g., "January 2024" instead of "2024-01")
  formatPeriodLabel(period: string): string {
    if (this.selectedTrendPeriod === 'monthly' && period.includes('-')) {
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return period;
  }

  // Calculate date range label
  getDateRangeLabel(): string {
    if (this.startDate && this.endDate) {
      return `${this.formatDate(this.startDate)} - ${this.formatDate(this.endDate)}`;
    }
    return 'Select date range';
  }

  // Check if export should show budget warnings
  shouldShowBudgetWarning(): boolean {
    if (!this.areBudgetAlertsEnabled()) return false;

    if (this.selectedReport === 'custom' && this.customReportData) {
      const utilization = this.calculateBudgetUtilization();
      return utilization >= this.getAlertThreshold();
    }
    return false;
  }

  // Generate report filename with currency
  generateReportFilename(baseName: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `${baseName}_${date}_${this.currentCurrency}`;
  }

  ngOnDestroy() {
    this.themeSubscription?.unsubscribe();
    this.settingsSubscription?.unsubscribe();
  }
}
