import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TransactionService,
  CategoryDetail,
  CategoryStatsResponse
} from '../services/transaction.service';
import { ThemeService } from '../theme.service';
import { Subscription } from 'rxjs';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-category-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-stats.component.html',
  styleUrls: ['./category-stats.component.scss']
})
export class CategoryStatsComponent implements OnInit, OnDestroy {
  timeFrames = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];

  selectedTimeFrame = 'month';

  stats: CategoryStatsResponse | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  isDarkMode = false;
  selectedCategory: CategoryDetail | null = null;
  viewMode: 'list' | 'chart' | 'details' = 'list';

  // Settings properties
  currentCurrency = 'USD';
  currentDateFormat = 'MM/DD/YYYY';
  appSettings: any;
  budgetSettings: any;

  private themeSubscription!: Subscription;
  private settingsSubscription!: Subscription;

  constructor(
    private transactionService: TransactionService,
    private themeService: ThemeService,
    private settingsService: SettingsService,
    private router: Router
  ) { }

  ngOnInit(): void {
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
        console.log('Category Stats - Settings updated:', settings);
      }
    );

    // Subscribe to budget settings changes
    this.settingsSubscription.add(
      this.settingsService.budgetSettings$.subscribe(
        settings => {
          this.budgetSettings = settings;
          console.log('Category Stats - Budget settings updated:', settings);
        }
      )
    );

    // Get initial settings
    this.appSettings = this.settingsService.getAppSettings();
    this.budgetSettings = this.settingsService.getBudgetSettings();
    this.currentCurrency = this.appSettings.currency;
    this.currentDateFormat = this.appSettings.dateFormat;

    this.loadCategoryStats();
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
    this.settingsSubscription?.unsubscribe();
  }

  // ===============================
  // DATA FETCHING
  // ===============================
  onTimeFrameChange(): void {
    this.loadCategoryStats();
  }

  loadCategoryStats(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.stats = null;
    this.selectedCategory = null;
    this.viewMode = 'list';

    this.transactionService
      .getCategoryStats(this.selectedTimeFrame)
      .subscribe({
        next: (data) => {
          this.stats = data;
          console.log('Category Stats loaded:', {
            timeframe: this.selectedTimeFrame,
            currency: this.currentCurrency,
            dateFormat: this.currentDateFormat,
            expenseCategories: data.expenseCategories?.length || 0,
            revenueCategories: data.revenueCategories?.length || 0
          });
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Failed to load category stats:', err);
          this.errorMessage = 'Failed to load category statistics.';
          this.isLoading = false;
        }
      });
  }

  // ===============================
  // NAVIGATION & VIEW MODES
  // ===============================
  selectCategory(category: CategoryDetail): void {
    this.selectedCategory = category;
    this.viewMode = 'details';
  }

  goBackToList(): void {
    this.selectedCategory = null;
    this.viewMode = 'list';
  }

  switchToChartView(): void {
    this.viewMode = 'chart';
    this.selectedCategory = null;
  }

  switchToListView(): void {
    this.viewMode = 'list';
    this.selectedCategory = null;
  }

  viewTransactions(category: CategoryDetail): void {
    this.router.navigate(['/transactions'], {
      queryParams: {
        category: category.category,
        type: category.type,
        timeFrame: this.selectedTimeFrame
      }
    });
  }

  // ===============================
  // CHART HELPERS
  // ===============================
  getPieSlicePath(
    category: CategoryDetail,
    allCategories: CategoryDetail[],
    index: number
  ): string {
    const centerX = 100;
    const centerY = 100;
    const radius = 90;

    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      startAngle += (allCategories[i].percentage / 100) * 360;
    }

    const endAngle = startAngle + (category.percentage / 100) * 360;

    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY}
            L ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
            Z`;
  }

  getBarHeight(amount: number, monthlyData: any[]): number {
    if (!monthlyData?.length) return 0;
    const max = Math.max(...monthlyData.map(m => m.amount));
    return max === 0 ? 0 : (amount / max) * 100;
  }

  // ===============================
  // FORMATTING METHODS
  // ===============================
  formatCurrency(amount: number): string {
    // Use the SettingsService for consistent currency formatting
    return this.settingsService.formatCurrency(amount);
  }

  formatPercentage(p: number): string {
    if (p == null || isNaN(p)) return '0.0%';
    return `${p.toFixed(1)}%`;
  }

  // New method to format dates using SettingsService
  formatDate(date: Date | string): string {
    return this.settingsService.formatDate(date);
  }

  // Get currency symbol from settings
  getCurrencySymbol(): string {
    return this.settingsService.getCurrencySymbol();
  }

  // ===============================
  // BUDGET-RELATED METHODS
  // ===============================

  // Get budget for a specific category
  getCategoryBudget(categoryName: string): number {
    if (!this.budgetSettings?.categories) return 0;

    const category = this.budgetSettings.categories.find(
      (c: any) => c.name.toLowerCase() === categoryName.toLowerCase()
    );

    return category ? category.budget : 0;
  }

  // Get amount spent for a specific category
  getCategorySpent(categoryName: string): number {
    if (!this.budgetSettings?.categories) return 0;

    const category = this.budgetSettings.categories.find(
      (c: any) => c.name.toLowerCase() === categoryName.toLowerCase()
    );

    return category ? category.spent : 0;
  }

  // Calculate budget utilization percentage for a category
  getCategoryBudgetUtilization(categoryName: string): number {
    const budget = this.getCategoryBudget(categoryName);
    const spent = this.getCategorySpent(categoryName);

    if (budget <= 0) return 0;
    return (spent / budget) * 100;
  }

  // Check if a category is over budget
  isCategoryOverBudget(categoryName: string): boolean {
    return this.getCategoryBudgetUtilization(categoryName) >= 100;
  }

  // Get budget status for a category
  getCategoryBudgetStatus(categoryName: string): 'safe' | 'warning' | 'danger' {
    const utilization = this.getCategoryBudgetUtilization(categoryName);
    const alertThreshold = this.budgetSettings?.alertThreshold || 80;

    if (utilization >= 100) return 'danger';
    if (utilization >= alertThreshold) return 'warning';
    return 'safe';
  }

  // Get remaining budget for a category
  getCategoryRemainingBudget(categoryName: string): number {
    const budget = this.getCategoryBudget(categoryName);
    const spent = this.getCategorySpent(categoryName);

    return budget - spent;
  }

  // ===============================
  // FILTERING AND SORTING
  // ===============================

  // Get categories sorted by amount (descending)
  getSortedExpenseCategories(): CategoryDetail[] {
    if (!this.stats?.expenseCategories) return [];
    return [...this.stats.expenseCategories].sort((a, b) => b.totalAmount - a.totalAmount);
  }

  // Get categories sorted by amount (descending)
  getSortedRevenueCategories(): CategoryDetail[] {
    if (!this.stats?.revenueCategories) return [];
    return [...this.stats.revenueCategories].sort((a, b) => b.totalAmount - a.totalAmount);
  }

  // Filter categories by search term
  filterCategories(categories: CategoryDetail[], searchTerm: string): CategoryDetail[] {
    if (!searchTerm) return categories;

    const term = searchTerm.toLowerCase();
    return categories.filter(category =>
      category.category.toLowerCase().includes(term) ||
      category.type.toLowerCase().includes(term)
    );
  }

  // ===============================
  // ICONS & COLORS
  // ===============================
  getCategoryIcon(category: string): string {
    if (!category) return '📊';
    const icons: Record<string, string> = {
      Food: '🍔',
      Transport: '🚗',
      Entertainment: '🎬',
      Shopping: '🛍️',
      Bills: '🧾',
      Healthcare: '🏥',
      Education: '📚',
      Travel: '✈️',
      Salary: '💰',
      Freelance: '💼',
      Investment: '📈',
      Gift: '🎁'
    };
    return icons[category] ?? '📊';
  }

  getCategoryColor(category: string): string {
    const map: Record<string, string> = {
      Food: '#dc2626',
      Transport: '#ea580c',
      Entertainment: '#f97316',
      Bills: '#f59e0b',
      Shopping: '#eab308',
      Healthcare: '#ca8a04',
      Education: '#a16207',
      Travel: '#854d0e',
      Utilities: '#713f12',
      Subscription: '#5c3c1c',

      Salary: '#065f46',
      Freelance: '#059669',
      Investment: '#0d9488',
      Business: '#a855f7',
      Gift: '#6366f1',
      Rental: '#8b5cf6',
      Other: '#0891b2',
    };
    return map[category] ?? '#6b7280';
  }

  // Get budget status color
  getBudgetStatusColor(status: 'safe' | 'warning' | 'danger'): string {
    const colors = {
      safe: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    };
    return colors[status];
  }

  // ===============================
  // TRENDS
  // ===============================
  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    return { up: '📈', down: '📉', stable: '➡️' }[trend];
  }

  getTrendClass(trend: 'up' | 'down' | 'stable'): string {
    return `trend-${trend}`;
  }

  // ===============================
  // SETTINGS-RELATED METHODS
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

  // Check if notifications are enabled
  areNotificationsEnabled(): boolean {
    return this.appSettings?.enableNotifications || false;
  }

  // Navigate to settings page
  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  // Calculate total for a list of categories
  calculateTotal(categories: CategoryDetail[]): number {
    return categories.reduce((sum, category) => sum + category.totalAmount, 0);
  }

  // Get average transaction amount for a list of categories
  getAverageTransaction(categories: CategoryDetail[]): number {
    if (!categories.length) return 0;

    const totalAmount = this.calculateTotal(categories);
    const totalTransactions = categories.reduce((sum, category) =>
      sum + category.transactionCount, 0);

    return totalTransactions > 0 ? totalAmount / totalTransactions : 0;
  }

  // Check if data is available
  hasData(): boolean {
    return !!this.stats &&
      (this.stats.expenseCategories?.length > 0 ||
        this.stats.revenueCategories?.length > 0);
  }

  // Get time frame label
  getTimeFrameLabel(): string {
    const timeFrame = this.timeFrames.find(tf => tf.value === this.selectedTimeFrame);
    return timeFrame?.label || this.selectedTimeFrame;
  }

  // Refresh data
  refreshData(): void {
    this.loadCategoryStats();
  }

  // Export category data
  exportCategoryData(): void {
    if (!this.stats) return;

    const data = {
      currency: this.currentCurrency,
      generatedAt: new Date().toISOString(),
      ...this.stats
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `category-statistics-${this.selectedTimeFrame}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);

    console.log('Category data exported successfully');
  }
}
