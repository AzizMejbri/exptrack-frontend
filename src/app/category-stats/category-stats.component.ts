
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

  private themeSubscription!: Subscription;

  constructor(
    private transactionService: TransactionService,
    private themeService: ThemeService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );

    this.loadCategoryStats();
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  // ===============================
  // DATA FETCHING
  // ===============================
  onTimeFrameChange(): void {
    this.loadCategoryStats();
  }

  //
  // export interface CategoryDetail {
  //   category: string;
  //   type: 'expense' | 'revenue';
  //   totalAmount: number;
  //   transactionCount: number;
  //   averageAmount: number;
  //   percentage: number;
  //   trend: 'up' | 'down' | 'stable';
  //   trendPercentage: number;
  //   monthlyData?: MonthlyData[];
  // }
  //
  // export interface CategoryStatsResponse {
  //   expenseCategories: CategoryDetail[];
  //   revenueCategories: CategoryDetail[];
  //   timeFrame: string;
  //   summary: {
  //     totalExpenses: number;
  //     totalRevenue: number;
  //     averageTransaction: number;
  //     mostSpentCategory: string;
  //     mostRevenueCategory: string;
  //   };
  // }
  //
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
          console.warn('Full data:', data);
          console.warn('Expense categories:', data.expenseCategories);
          console.warn('First expense:', data.expenseCategories[0]);
          console.warn('Second expense:', data.expenseCategories[1]);
          console.warn('Revenue categories:', data.revenueCategories);
          console.warn('First revenue:', data.revenueCategories[0]);
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
  // FORMATTING
  // ===============================
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatPercentage(p: number): string {
    if (p == null || isNaN(p)) return '0.0%';
    return `${p.toFixed(1)}%`;
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
      // Food: '#ef4444',        // red
      // Transport: '#f87171',   // light red
      // Entertainment: '#fbbf24', // yellow-orange
      // Bills: '#facc15',       // yellow
      // Shopping: '#fde68a',    // pale yellow
      // Healthcare: '#fcd34d',   // golden yellow
      // Salary: '#16a34a',      // green
      // Freelance: '#22c55e',   // lime-green
      // Investment: '#7c3aed',  // purple
      // Gift: '#a78bfa',        // light purple
      // Other: '#6b7280'        // gr
      Food: '#dc2626',        // deep red
      Transport: '#ea580c',   // orange-red
      Entertainment: '#f97316', // bright orange
      Bills: '#f59e0b',       // amber
      Shopping: '#eab308',    // yellow-gold
      Healthcare: '#ca8a04',  // golden yellow
      Education: '#a16207',   // dark yellow
      Travel: '#854d0e',      // brown-yellow
      Utilities: '#713f12',   // dark brown-yellow
      Subscription: '#5c3c1c', // very dark yellow-brown

      Salary: '#065f46',      // deep green
      Freelance: '#059669',   // emerald green
      Investment: '#0d9488',  // teal
      Business: '#a855f7',        // purple
      Gift: '#6366f1',       // indigo
      Rental: '#8b5cf6',      // violet
      Other: '#0891b2',    // cyan-blue
    };
    return map[category] ?? '#6b7280';
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
}
