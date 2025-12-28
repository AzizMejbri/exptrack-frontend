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
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  summary: TransactionSummary;
  categorySummary: CategorySummary[] = [];
  isLoading = true;
  isDarkMode = false;
  hasChartData = false;
  isUsingMockData = false;
  private themeSubscription!: Subscription;

  constructor(
    private transactionService: TransactionService,
    private themeService: ThemeService,
    private router: Router,
    private authService: AuthService
  ) {
    this.summary = this.getMockSummary();
  }

  ngOnInit() {
    // Debug logging
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
    // Wait a bit for view to render
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
    this.isUsingMockData = false;
    let loaded = 0;

    const finish = () => {
      loaded++;
      console.log(`✔️ Loaded ${loaded}/3 data sources`);
      if (loaded === 3) {
        this.isLoading = false;
        console.log('✅ All data loaded!');
        console.log('📈 Final transactions:', this.transactions);
        console.log('💰 Final summary:', this.summary);
        console.log('📂 Final categories:', this.categorySummary);
        console.log('🎭 Using mock data:', this.isUsingMockData);
        setTimeout(() => this.updatePieChart(), 50);
      }
    };

    // Transactions
    this.transactionService.getTransactions(this.selectedTimeFrame, 5)
      .pipe(catchError((error: any) => {
        console.error('🔴 Transactions error:', error);
        this.isUsingMockData = true;
        return of([]);
      }))
      .subscribe((data: Transaction[]) => {
        console.log('📥 Received transactions:', data);
        console.log('📏 Data length:', data?.length);

        if (!data || data.length === 0) {
          console.log('⚠️ No transactions from backend, using mock data');
          this.transactions = this.getMockTransactions();
          this.isUsingMockData = true;
        } else {
          console.log('✅ Using real transactions from backend');
          this.transactions = data;
        }

        finish();
      });

    // Summary
    this.transactionService.getTransactionSummary(this.selectedTimeFrame)
      .pipe(catchError((error: any) => {
        console.error('🔴 Summary error:', error);
        this.isUsingMockData = true;
        return of(this.getMockSummary());
      }))
      .subscribe((summary: TransactionSummary) => {
        console.log('📥 Received summary:', summary);

        const expenses = Number(summary?.totalExpenses) || 0;
        const revenue = Number(summary?.totalRevenue) || 0;

        if (expenses === 0 && revenue === 0) {
          console.log('⚠️ Empty summary from backend, using mock data');
          this.summary = this.getMockSummary();
          this.isUsingMockData = true;
        } else {
          console.log('✅ Using real summary from backend');
          this.summary = summary;
          this.hasChartData = true;
        }

        finish();
      });

    // Categories
    this.transactionService.getCategorySummary(this.selectedTimeFrame)
      .pipe(catchError((error: any) => {
        console.error('🔴 Categories error:', error);
        this.isUsingMockData = true;
        return of(this.getMockCategories());
      }))
      .subscribe((data: CategorySummary[]) => {
        console.log('📥 Received categories:', data);

        if (!data || data.length === 0) {
          console.log('⚠️ No categories from backend, using mock data');
          this.categorySummary = this.getMockCategories();
          this.isUsingMockData = true;
        } else {
          console.log('✅ Using real categories from backend');
          this.categorySummary = data;
        }

        finish();
      });
  }

  destroyChart() {
    if (this.pieChart) {
      this.pieChart.destroy();
      this.pieChart = null;
    }
  }

  updatePieChart() {
    // Destroy existing chart
    this.destroyChart();

    // Check if we have data and canvas element
    if (!this.pieChartRef?.nativeElement) {
      console.warn('Canvas element not found');
      return;
    }

    const revenue = Number(this.summary?.totalRevenue) || 0;
    const expenses = Number(this.summary?.totalExpenses) || 0;
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

  /* --------------------- MOCK DATA --------------------- */
  getMockTransactions(): Transaction[] {
    return [
      { id: '1', amount: 150, type: 'expense', category: 'Food', description: 'Lunch', createdAt: new Date(), updatedAt: new Date() },
      { id: '2', amount: 200, type: 'expense', category: 'Transport', description: 'Bus Pass', createdAt: new Date(), updatedAt: new Date() },
      { id: '3', amount: 3000, type: 'revenue', category: 'Salary', description: 'Monthly Salary', createdAt: new Date(), updatedAt: new Date() },
      { id: '4', amount: 75, type: 'expense', category: 'Entertainment', description: 'Movies', createdAt: new Date(), updatedAt: new Date() },
      { id: '5', amount: 500, type: 'revenue', category: 'Freelance', description: 'Web Project', createdAt: new Date(), updatedAt: new Date() }
    ];
  }

  getMockSummary(): TransactionSummary {
    return {
      totalExpenses: 425,
      totalRevenue: 3500,
      expenseCount: 3,
      revenueCount: 2,
      netAmount: 3075,
      period: this.selectedTimeFrame,
      currency: 'USD',
    };
  }

  getMockCategories(): CategorySummary[] {
    return [
      { category: 'Food', amount: 150, type: 'expense', percentage: 35.3 },
      { category: 'Transport', amount: 200, type: 'expense', percentage: 47.1 },
      { category: 'Entertainment', amount: 75, type: 'expense', percentage: 17.6 },
      { category: 'Salary', amount: 3000, type: 'revenue', percentage: 85.7 },
      { category: 'Freelance', amount: 500, type: 'revenue', percentage: 14.3 }
    ];
  }

  formatCurrency(amount: number | null | undefined): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);
  }

  getExpenseCategories(): CategorySummary[] {
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
}
