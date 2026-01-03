import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../services/transaction.service';
import { ThemeService } from '../theme.service';
import { SettingsService } from '../services/settings.service';
import {
  Transaction,
  TransactionSummary,
  CategorySummary
} from '../models/transaction.model';
import { Subscription } from 'rxjs';
import Chart from 'chart.js/auto';
import { AuthService } from '../auth/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('pieChart', { static: false }) pieChartRef!: ElementRef;
  private pieChart: Chart | null = null;

  timeFrames = [
    { value: 'month', label: 'This Month' },
    { value: 'week', label: 'This Week' },
    { value: 'day', label: 'Today' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];

  selectedTimeFrame = 'month';
  transactions: Transaction[] = [];
  summary: TransactionSummary | null = null;
  categorySummary: CategorySummary[] = [];
  isLoading = true;
  isDarkMode = false;
  hasChartData = false;
  hasError = false;
  errorMessage = '';

  private subscriptions: Subscription[] = [];

  // Budget alerts
  showBudgetAlert = false;
  budgetAlertMessage = '';
  budgetAlertType: 'warning' | 'danger' = 'warning';

  constructor(
    private transactionService: TransactionService,
    private themeService: ThemeService,
    private settingsService: SettingsService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    console.log('🏠 Dashboard initialized');
    console.log('👤 Current User:', this.authService.getCurrentUser());

    // Request notification permission if enabled
    this.settingsService.requestNotificationPermission();

    // Subscribe to theme changes
    const themeSub = this.themeService.isDarkMode$.subscribe(
      (mode: boolean) => {
        this.isDarkMode = mode;
        this.updatePieChart();
      }
    );
    this.subscriptions.push(themeSub);

    // Subscribe to settings changes
    const appSettingsSub = this.settingsService.appSettings$.subscribe(() => {
      console.log('🔄 Settings changed, updating UI');
      this.updatePieChart();
    });
    this.subscriptions.push(appSettingsSub);

    const budgetSettingsSub = this.settingsService.budgetSettings$.subscribe(() => {
      console.log('🔄 Budget settings changed, checking alerts');
      this.checkBudgetAlerts();
    });
    this.subscriptions.push(budgetSettingsSub);

    this.loadDashboardData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.updatePieChart();
    }, 100);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroyChart();
  }

  onTimeFrameChange() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    console.log('⏰ Selected timeframe:', this.selectedTimeFrame);

    this.isLoading = true;
    this.hasChartData = false;
    this.hasError = false;
    this.errorMessage = '';
    let loaded = 0;
    let failed = 0;

    const finish = () => {
      loaded++;
      console.log(`✔️ Loaded ${loaded}/3 data sources`);
      if (loaded === 3) {
        this.isLoading = false;

        if (failed === 3) {
          this.hasError = true;
          this.errorMessage = 'Failed to load dashboard data. Please try again.';
          console.error('❌ All data sources failed to load');
        } else {
          console.log('✅ Dashboard data loaded successfully!');

          // Check budget alerts after data is loaded
          this.checkBudgetAlerts();

          setTimeout(() => this.updatePieChart(), 50);
        }
      }
    };

    const handleError = (source: string, error: any) => {
      console.error(`❌ ${source} failed:`, error);
      failed++;
      finish();
    };

    // Transactions
    this.transactionService.getTransactions(this.selectedTimeFrame, 5)
      .subscribe({
        next: (data: Transaction[]) => {
          this.transactions = data || [];
          finish();
        },
        error: (error) => handleError('Transactions', error)
      });

    // Summary
    this.transactionService.getTransactionSummary(this.selectedTimeFrame)
      .subscribe({
        next: (summary: TransactionSummary) => {
          this.summary = summary;
          const expenses = Number(summary?.totalExpenses) || 0;
          const revenue = Number(summary?.totalRevenue) || 0;
          this.hasChartData = (expenses > 0 || revenue > 0);
          finish();
        },
        error: (error) => handleError('Summary', error)
      });

    // Categories
    this.transactionService.getCategorySummary(this.selectedTimeFrame)
      .subscribe({
        next: (data: CategorySummary[]) => {
          this.categorySummary = data || [];
          finish();
        },
        error: (error) => handleError('Categories', error)
      });
  }

  /**
   * Check if spending is approaching or exceeding budget limits
   */
  checkBudgetAlerts() {
    if (!this.settingsService.shouldShowBudgetAlerts()) {
      this.showBudgetAlert = false;
      return;
    }

    const budgetSettings = this.settingsService.getBudgetSettings();
    const totalExpenses = Number(this.summary?.totalExpenses) || 0;

    // Check monthly budget
    if (this.selectedTimeFrame === 'month') {
      const budgetUsed = (totalExpenses / budgetSettings.monthlyBudget) * 100;

      if (totalExpenses >= budgetSettings.monthlyBudget) {
        this.showBudgetAlert = true;
        this.budgetAlertType = 'danger';
        this.budgetAlertMessage = `⚠️ You've exceeded your monthly budget of ${this.formatCurrency(budgetSettings.monthlyBudget)} by ${this.formatCurrency(totalExpenses - budgetSettings.monthlyBudget)}!`;
        this.settingsService.showNotification('Budget Alert', this.budgetAlertMessage);
      } else if (budgetUsed >= budgetSettings.alertThreshold) {
        this.showBudgetAlert = true;
        this.budgetAlertType = 'warning';
        this.budgetAlertMessage = `📊 You've used ${budgetUsed.toFixed(0)}% of your monthly budget (${this.formatCurrency(totalExpenses)} of ${this.formatCurrency(budgetSettings.monthlyBudget)})`;
      } else {
        this.showBudgetAlert = false;
      }
    }

    // Check weekly budget
    if (this.selectedTimeFrame === 'week') {
      const budgetUsed = (totalExpenses / budgetSettings.weeklyBudget) * 100;

      if (totalExpenses >= budgetSettings.weeklyBudget) {
        this.showBudgetAlert = true;
        this.budgetAlertType = 'danger';
        this.budgetAlertMessage = `⚠️ You've exceeded your weekly budget of ${this.formatCurrency(budgetSettings.weeklyBudget)} by ${this.formatCurrency(totalExpenses - budgetSettings.weeklyBudget)}!`;
        this.settingsService.showNotification('Budget Alert', this.budgetAlertMessage);
      } else if (budgetUsed >= budgetSettings.alertThreshold) {
        this.showBudgetAlert = true;
        this.budgetAlertType = 'warning';
        this.budgetAlertMessage = `📊 You've used ${budgetUsed.toFixed(0)}% of your weekly budget (${this.formatCurrency(totalExpenses)} of ${this.formatCurrency(budgetSettings.weeklyBudget)})`;
      } else {
        this.showBudgetAlert = false;
      }
    }
  }

  destroyChart() {
    if (this.pieChart) {
      this.pieChart.destroy();
      this.pieChart = null;
    }
  }

  updatePieChart() {
    this.destroyChart();

    if (!this.pieChartRef?.nativeElement || !this.summary) {
      return;
    }

    const revenue = Number(this.summary.totalRevenue) || 0;
    const expenses = Number(this.summary.totalExpenses) || 0;
    const total = revenue + expenses;

    if (total <= 0) {
      return;
    }

    const ctx = this.pieChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    try {
      this.pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Revenue', 'Expenses'],
          datasets: [{
            data: [revenue, expenses],
            backgroundColor: ['#10B981', '#EF4444'],
            borderColor: this.isDarkMode ? '#374151' : '#fff',
            borderWidth: 2,
            hoverOffset: 15
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: this.isDarkMode ? '#D1D5DB' : '#4B5563',
                font: { size: 14, family: "'Inter', sans-serif" },
                padding: 20,
                usePointStyle: true
              }
            },
            tooltip: {
              backgroundColor: this.isDarkMode ? '#1F2937' : '#fff',
              titleColor: this.isDarkMode ? '#D1D5DB' : '#111827',
              bodyColor: this.isDarkMode ? '#D1D5DB' : '#111827',
              borderColor: this.isDarkMode ? '#4B5563' : '#E5E7EB',
              borderWidth: 1,
              callbacks: {
                label: (context: any) => {
                  const label = context.label || '';
                  const value = context.parsed;
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${this.formatCurrency(value)} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }

  formatCurrency(amount: number | null | undefined): string {
    return this.settingsService.formatCurrency(amount);
  }

  formatDate(date: Date | string): string {
    return this.settingsService.formatDate(date);
  }

  getBudgetProgress(): number {
    const totalExpenses = Number(this.summary?.totalExpenses) || 0;
    const budgetSettings = this.settingsService.getBudgetSettings();

    if (this.selectedTimeFrame === 'month') {
      return Math.min((totalExpenses / budgetSettings.monthlyBudget) * 100, 100);
    } else if (this.selectedTimeFrame === 'week') {
      return Math.min((totalExpenses / budgetSettings.weeklyBudget) * 100, 100);
    }

    return 0;
  }

  getBudgetStatusClass(): string {
    const progress = this.getBudgetProgress();
    const threshold = this.settingsService.getBudgetSettings().alertThreshold;

    if (progress >= 100) return 'over-budget';
    if (progress >= threshold) return 'near-budget';
    return 'under-budget';
  }

  getExpenseCategories(): CategorySummary[] {
    return this.categorySummary.filter((c: CategorySummary) => c.type === 'expense');
  }

  getRevenueCategories(): CategorySummary[] {
    return this.categorySummary.filter((c: CategorySummary) => c.type === 'revenue');
  }

  showFullTransactions(): void {
    this.router.navigate([`/transactions/${this.authService.getCurrentUser()?.id}`]);
  }

  retryLoad(): void {
    this.loadDashboardData();
  }

  dismissBudgetAlert(): void {
    this.showBudgetAlert = false;
  }
}
