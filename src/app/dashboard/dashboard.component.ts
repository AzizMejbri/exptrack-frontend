import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../services/transaction.service';
import { ThemeService } from '../theme.service';
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
  private themeSubscription!: Subscription;

  constructor(
    private transactionService: TransactionService,
    private themeService: ThemeService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    console.log('🏠 Dashboard initialized');
    console.log('👤 Current User:', this.authService.getCurrentUser());

    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      (mode: boolean) => {
        this.isDarkMode = mode;
        this.updatePieChart();
      }
    );
    this.loadDashboardData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.updatePieChart();
    }, 100);
  }

  ngOnDestroy() {
    this.themeSubscription?.unsubscribe();
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
          console.log('📈 Final transactions:', this.transactions);
          console.log('💰 Final summary:', this.summary);
          console.log('📂 Final categories:', this.categorySummary);
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
          console.log('📥 Received transactions:', data);
          this.transactions = data || [];
          finish();
        },
        error: (error) => handleError('Transactions', error)
      });

    // Summary
    this.transactionService.getTransactionSummary(this.selectedTimeFrame)
      .subscribe({
        next: (summary: TransactionSummary) => {
          console.log('📥 Received summary:', summary);
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
          console.log('📥 Received categories:', data);
          this.categorySummary = data || [];
          finish();
        },
        error: (error) => handleError('Categories', error)
      });
  }

  destroyChart() {
    if (this.pieChart) {
      this.pieChart.destroy();
      this.pieChart = null;
    }
  }

  updatePieChart() {
    this.destroyChart();

    if (!this.pieChartRef?.nativeElement) {
      console.warn('Canvas element not found');
      return;
    }

    if (!this.summary) {
      console.warn('No summary data available for chart');
      return;
    }

    const revenue = Number(this.summary.totalRevenue) || 0;
    const expenses = Number(this.summary.totalExpenses) || 0;
    const total = revenue + expenses;

    if (total <= 0) {
      console.warn('No data for chart');
      return;
    }

    const ctx = this.pieChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    try {
      this.pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Revenue', 'Expenses'],
          datasets: [{
            data: [revenue, expenses],
            backgroundColor: [
              '#10B981', // Green for revenue
              '#EF4444'  // Red for expenses
            ],
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
                font: {
                  size: 14,
                  family: "'Inter', sans-serif"
                },
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
                  return `${label}: $${value.toLocaleString()} (${percentage}%)`;
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);
  }

  getExpenseCategories(): CategorySummary[] {
    console.log(`${this.categorySummary}`);
    return this.categorySummary.filter((c: CategorySummary) => c.type === 'expense');
  }

  getRevenueCategories(): CategorySummary[] {
    return this.categorySummary.filter((c: CategorySummary) => c.type === 'revenue');
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  showFullTransactions(): void {
    this.router.navigate([`/transactions/${this.authService.getCurrentUser()?.id}`]);
  }

  retryLoad(): void {
    this.loadDashboardData();
  }
}
