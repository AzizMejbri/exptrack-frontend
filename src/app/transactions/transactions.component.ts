import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../services/transaction.service';
import { SettingsService } from '../services/settings.service';
import { Transaction } from '../models/transaction.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  showAddModal = false;
  showEditModal = false;

  // Filters
  searchTerm = '';
  selectedType: 'all' | 'expense' | 'revenue' = 'all';
  selectedCategory = 'all';
  dateRange = {
    start: '',
    end: ''
  };

  // New transaction form
  newTransaction: Partial<Transaction> = {
    type: 'expense',
    amount: 0,
    category: '',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Edit transaction form
  editingTransaction: Partial<Transaction> = {};
  editingTransactionId: string = '';

  // Categories from settings or defaults
  categories = {
    expense: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Healthcare'],
    revenue: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other']
  };

  // Budget alerts - MUST BE HERE, BEFORE subscriptions
  activeBudgetAlerts: Array<{
    id: string;
    type: 'warning' | 'danger';
    title: string;
    message: string;
  }> = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private transactionService: TransactionService,
    private settingsService: SettingsService
  ) { }

  ngOnInit() {
    this.loadSettings();
    this.loadTransactions();
    this.subscribeToSettingsChanges();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Load user settings and apply defaults
   */
  loadSettings() {
    const appSettings = this.settingsService.getAppSettings();
    const budgetSettings = this.settingsService.getBudgetSettings();

    // Set default transaction type from settings
    this.newTransaction.type = appSettings.defaultTransactionType as 'expense' | 'revenue';

    // Load custom categories from budget settings if available
    if (budgetSettings.categories && budgetSettings.categories.length > 0) {
      const customCategories = budgetSettings.categories.map(cat => cat.name);
      // Merge with default expense categories
      this.categories.expense = [
        ...new Set([...this.categories.expense, ...customCategories])
      ];
    }

    console.log('✅ Settings loaded:', {
      defaultType: this.newTransaction.type,
      currency: appSettings.currency,
      dateFormat: appSettings.dateFormat
    });
  }

  /**
   * Subscribe to settings changes for real-time updates
   */
  subscribeToSettingsChanges() {
    const appSettingsSub = this.settingsService.appSettings$.subscribe(settings => {
      console.log('🔄 App settings changed, updating UI');
      // Re-render transactions with new currency/date formats
      this.applyFilters();
    });

    const budgetSettingsSub = this.settingsService.budgetSettings$.subscribe(budgetSettings => {
      console.log('🔄 Budget settings changed, updating categories');
      // Update categories if budget categories changed
      if (budgetSettings.categories && budgetSettings.categories.length > 0) {
        const customCategories = budgetSettings.categories.map(cat => cat.name);
        this.categories.expense = [
          ...new Set([...['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Healthcare'], ...customCategories])
        ];
      }
    });

    this.subscriptions.push(appSettingsSub, budgetSettingsSub);
  }

  loadTransactions() {
    this.transactionService.getTransactions('all').subscribe(transactions => {
      this.transactions = transactions;
      this.applyFilters();
    });
  }

  applyFilters() {
    this.filteredTransactions = this.transactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesType = this.selectedType === 'all' || transaction.type === this.selectedType;

      const matchesCategory = this.selectedCategory === 'all' || transaction.category === this.selectedCategory;

      const matchesDate = !this.dateRange.start || !this.dateRange.end ||
        (new Date(transaction.createdAt) >= new Date(this.dateRange.start) &&
          new Date(transaction.createdAt) <= new Date(this.dateRange.end));

      return matchesSearch && matchesType && matchesCategory && matchesDate;
    });
  }

  addTransaction() {
    if (
      !this.newTransaction.amount ||
      !this.newTransaction.category ||
      !this.newTransaction.description ||
      !this.newTransaction.type
    ) {
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    const payload = {
      amount: this.newTransaction.amount,
      type: this.newTransaction.type,
      category: this.newTransaction.category,
      source: this.newTransaction.category,
      description: this.newTransaction.description
    };

    this.transactionService.addTransaction(payload).subscribe({
      next: (createdTransaction) => {
        this.transactions.unshift(createdTransaction);
        this.applyFilters();
        this.closeAddModal();
        this.resetForm();

        // Update budget category spent amount
        this.updateBudgetCategorySpent(createdTransaction);

        // Show success notification if enabled
        this.showNotification('Transaction added successfully', 'success');

        // Check budget alerts
        this.checkBudgetAfterTransaction();
      },
      error: (err) => {
        console.error('❌ Failed to add transaction', err);
        this.showNotification('Failed to add transaction', 'error');
      }
    });
  }

  editTransaction(transaction: Transaction) {
    console.log('Opening edit modal for transaction:', transaction);
    this.editingTransactionId = transaction.id;
    this.editingTransaction = {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
      createdAt: transaction.createdAt
    };
    this.showEditModal = true;
  }

  updateTransaction() {
    console.log('Update transaction called');
    if (
      !this.editingTransaction.amount ||
      !this.editingTransaction.category ||
      !this.editingTransaction.description ||
      !this.editingTransaction.type
    ) {
      console.log('Validation failed');
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    const payload = {
      amount: this.editingTransaction.amount,
      type: this.editingTransaction.type,
      category: this.editingTransaction.category,
      source: this.editingTransaction.category,
      description: this.editingTransaction.description
    };

    console.log('Updating transaction with payload:', payload);

    if (typeof this.transactionService.updateTransaction === 'function') {
      this.transactionService.updateTransaction(
        this.editingTransactionId,
        this.editingTransaction.type!,
        payload
      ).subscribe({
        next: (updatedTransaction) => {
          console.log('✅ Transaction updated successfully', updatedTransaction);
          const index = this.transactions.findIndex(t => t.id === this.editingTransactionId);
          if (index !== -1) {
            this.transactions[index] = updatedTransaction;
          }
          this.applyFilters();
          this.closeEditModal();

          // Update budget tracking
          this.updateBudgetCategorySpent(updatedTransaction);

          // Show success notification
          this.showNotification('Transaction updated successfully', 'success');

          // Check budget alerts
          this.checkBudgetAfterTransaction();
        },
        error: (err) => {
          console.error('❌ Failed to update transaction', err);
          this.showNotification('Failed to update transaction', 'error');
        }
      });
    } else {
      console.error('❌ updateTransaction method not found in service');
      this.showNotification('Update functionality not available', 'error');
    }
  }

  deleteTransaction(transaction: Transaction) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      console.log('Deleting transaction:', transaction.id, 'type:', transaction.type);

      this.transactionService.deleteTransaction(transaction.id, transaction.type).subscribe({
        next: () => {
          console.log('✅ Transaction deleted successfully');
          this.transactions = this.transactions.filter(t => t.id !== transaction.id);
          this.applyFilters();

          // Update budget tracking
          this.updateBudgetCategorySpent(transaction, true);

          // Show success notification
          this.showNotification('Transaction deleted successfully', 'success');
        },
        error: (err) => {
          console.error('❌ Failed to delete transaction', err);
          this.showNotification('Failed to delete transaction', 'error');
        }
      });
    }
  }

  /**
   * Update budget category spent amount after transaction changes
   */
  updateBudgetCategorySpent(transaction: Transaction, isDelete: boolean = false) {
    if (transaction.type !== 'expense') return;

    const budgetSettings = this.settingsService.getBudgetSettings();
    const categoryIndex = budgetSettings.categories.findIndex(
      cat => cat.name.toLowerCase() === transaction.category.toLowerCase()
    );

    if (categoryIndex !== -1) {
      const category = budgetSettings.categories[categoryIndex];

      if (isDelete) {
        // Subtract from spent amount when deleting
        category.spent = Math.max(0, category.spent - transaction.amount);
      } else {
        // Add to spent amount when adding
        category.spent += transaction.amount;
      }

      // Update settings
      this.settingsService.updateBudgetSettings(budgetSettings);

      console.log(`📊 Updated ${category.name} budget: ${category.spent}/${category.budget}`);
    }
  }

  /**
   * Check budget alerts after transaction changes
   */
  checkBudgetAfterTransaction() {
    if (!this.settingsService.shouldShowBudgetAlerts()) {
      console.log('Budget alerts disabled in settings');
      return;
    }

    const budgetSettings = this.settingsService.getBudgetSettings();

    console.log('🔍 Checking budget alerts...');
    console.log('Alert threshold:', budgetSettings.alertThreshold);

    // Calculate total expenses this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExpenses = this.transactions
      .filter(t =>
        t.type === 'expense' &&
        new Date(t.createdAt) >= startOfMonth
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const budgetUsed = (monthExpenses / budgetSettings.monthlyBudget) * 100;

    console.log(`💰 Monthly Budget: ${this.formatCurrency(budgetSettings.monthlyBudget)}`);
    console.log(`💸 Spent: ${this.formatCurrency(monthExpenses)}`);
    console.log(`📊 Usage: ${budgetUsed.toFixed(1)}%`);

    // Check if budget exceeded
    if (monthExpenses >= budgetSettings.monthlyBudget) {
      const overAmount = monthExpenses - budgetSettings.monthlyBudget;
      const message = `You've exceeded your monthly budget of ${this.formatCurrency(budgetSettings.monthlyBudget)} by ${this.formatCurrency(overAmount)}!`;

      console.log('🚨 BUDGET EXCEEDED!');

      // Show browser notification
      this.settingsService.showNotification('⚠️ Budget Exceeded', message);

      // Show in-app alert banner
      this.showBudgetAlertBanner(
        'danger',
        '⚠️ Monthly Budget Exceeded!',
        message
      );
    }
    // Check if approaching threshold
    else if (budgetUsed >= budgetSettings.alertThreshold) {
      const message = `You've used ${budgetUsed.toFixed(0)}% of your monthly budget (${this.formatCurrency(monthExpenses)} of ${this.formatCurrency(budgetSettings.monthlyBudget)})`;

      console.log('⚠️ BUDGET THRESHOLD REACHED!');

      // Show browser notification
      this.settingsService.showNotification('💡 Budget Warning', message);

      // Show in-app alert banner
      this.showBudgetAlertBanner(
        'warning',
        '💡 Approaching Budget Limit',
        message
      );
    } else {
      console.log('✅ Budget OK');
    }

    // Check category budgets
    console.log('🏷️ Checking category budgets...');
    budgetSettings.categories.forEach(category => {
      if (category.budget <= 0) return;

      const percentage = (category.spent / category.budget) * 100;
      console.log(`  ${category.name}: ${percentage.toFixed(1)}% (${this.formatCurrency(category.spent)}/${this.formatCurrency(category.budget)})`);

      if (category.spent >= category.budget) {
        const overAmount = category.spent - category.budget;
        const message = `${category.name} budget exceeded by ${this.formatCurrency(overAmount)}!`;

        console.log(`  🚨 ${category.name} EXCEEDED!`);

        this.settingsService.showNotification(
          '⚠️ Category Budget Exceeded',
          message
        );

        this.showBudgetAlertBanner(
          'danger',
          `⚠️ ${category.name} Budget Exceeded`,
          message
        );
      } else if (percentage >= budgetSettings.alertThreshold) {
        const message = `${category.name}: ${percentage.toFixed(0)}% of budget used (${this.formatCurrency(category.spent)} of ${this.formatCurrency(category.budget)})`;

        console.log(`  ⚠️ ${category.name} threshold reached!`);

        this.settingsService.showNotification(
          '💡 Category Budget Warning',
          message
        );

        this.showBudgetAlertBanner(
          'warning',
          `💡 ${category.name} Approaching Limit`,
          message
        );
      }
    });
  }

  /**
   * Show in-app alert banner
   */
  showBudgetAlertBanner(type: 'warning' | 'danger', title: string, message: string) {
    // Add to active alerts array
    const alert = {
      id: `alert-${Date.now()}-${Math.random()}`,
      type,
      title,
      message
    };

    // Check if similar alert already exists
    const exists = this.activeBudgetAlerts.some((a: { title: string; message: string }) =>
      a.title === title && a.message === message
    );

    if (!exists) {
      this.activeBudgetAlerts.push(alert);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        this.dismissAlert(alert.id);
      }, 10000);
    }

    // Also show floating notification
    this.showFloatingNotification(type, title, message);
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId: string) {
    this.activeBudgetAlerts = this.activeBudgetAlerts.filter((a: { id: string }) => a.id !== alertId);
  }

  /**
   * Dismiss all alerts
   */
  dismissAllAlerts() {
    this.activeBudgetAlerts = [];
  }

  /**
   * Show floating notification banner
   */
  showFloatingNotification(type: 'warning' | 'danger', title: string, message: string) {
    const banner = document.createElement('div');
    banner.className = `floating-notification notification-${type}`;
    banner.innerHTML = `
      <div class="notification-icon">
        ${type === 'danger' ? '⚠️' : '💡'}
      </div>
      <div class="notification-content">
        <strong class="notification-title">${title}</strong>
        <p class="notification-message">${message}</p>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    banner.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 420px;
      padding: 1.25rem;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      ${type === 'danger'
        ? 'background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); border-left: 5px solid #EF4444;'
        : 'background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-left: 5px solid #F59E0B;'
      }
    `;

    // Add styles if not already present
    if (!document.querySelector('#floating-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'floating-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
        }

        .floating-notification .notification-icon {
          font-size: 2rem;
          line-height: 1;
        }

        .floating-notification .notification-content {
          flex: 1;
          color: #111827;
        }

        .floating-notification .notification-title {
          display: block;
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.375rem;
          color: #111827;
        }

        .floating-notification .notification-message {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #374151;
        }

        .floating-notification .notification-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6B7280;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .floating-notification .notification-close:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #111827;
        }

        [data-theme="dark"] .floating-notification.notification-danger {
          background: linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%);
          border-left-color: #EF4444;
        }

        [data-theme="dark"] .floating-notification.notification-warning {
          background: linear-gradient(135deg, #78350F 0%, #92400E 100%);
          border-left-color: #F59E0B;
        }

        [data-theme="dark"] .floating-notification .notification-content,
        [data-theme="dark"] .floating-notification .notification-title {
          color: #F3F4F6;
        }

        [data-theme="dark"] .floating-notification .notification-message {
          color: #D1D5DB;
        }

        [data-theme="dark"] .floating-notification .notification-close {
          color: #9CA3AF;
        }

        [data-theme="dark"] .floating-notification .notification-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #F3F4F6;
        }
      `;
      document.head.appendChild(style);
    }

    // Stack notifications if multiple exist
    const existingNotifications = document.querySelectorAll('.floating-notification');
    let topOffset = 20;
    existingNotifications.forEach((notif) => {
      const notifElement = notif as HTMLElement;
      topOffset += notifElement.offsetHeight + 12;
    });
    banner.style.top = `${topOffset}px`;

    // Add to DOM
    document.body.appendChild(banner);

    // Play sound if available
    this.playNotificationSound();

    // Remove after 8 seconds with animation
    setTimeout(() => {
      banner.style.animation = 'slideOutRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      setTimeout(() => banner.remove(), 400);
    }, 8000);
  }

  /**
   * Play notification sound
   */
  playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnMnBSuBzvLZiTYHGmmz6+OdTwsNT6Lf8bllHAU6jtXzzn0pBSh+zPDalUIJElyw6OOlVRUKRJzi8r5uIgU2jtXzwoAxBhxru+vgmE4LDU+i3/G5ZRwFOo7V886AKgUnfszw2pVCCRJasOjjpVUVCkSc4vK+biIFNo7V88KAMQYca7vr4JhOCw1Pot/xuWUcBTqO1fPOgCoFJ37M8NqVQgkSWrDo46VVFQpEnOLyvm4iBTaO1fPCgDEGHGu76+CYTgsNT6Lf8bllHAU6jtXzzn8qBSh+zPDalUIJElqw6OOlVRUKRJzi8r5uIgU2jtXzwoAxBhxru+vgmE4LDU+i3/G5ZRwFOo7V886AKgUnfszw2pVCCRJasOjjpVUVCkSc4vK+biIFNo7V88KAMQYca7vr4JhOCw1Pot/xuWUcBTqO1fPOgCoFJ37M8NqVQgkSWrDo46VVFQpEnOLyvm4iBTaO1fPCgDEGHGu76+CYTgsNT6Lf8bllHAU6jtXzzn8qBSh+zPDalUIJElqw6OOlVRUKRJzi8r5uIgU2jtXzwoAxBhxru+vgmE4LDU+i3/G5ZRwFOo7V886AKgUnfszw2pVCCRJasOjjpVUVCkSc4vK+biIFNo7V88KAMQYca7vr4JhOCw1Pot/xuWUcBTqO1fPOgCoFJ37M8NqVQgkSWrDo46VVFQpEnOLyvm4iBTaO1fPCgDEGHGu76+CYTgsNT6Lf8bllHAU6jtXzzn8qBSh+zPDalUIJElqw6OOlVRUKRJzi8r5uIgU2jtXzwoAxBhxru+vgmE4LDU+i3/G5ZRwFOo7V886AKgUnfszw2pVCCRJasOjjpVUVCkSc4vK+biIFNo7V88KAMQYca7vr4JhOCw==');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore if sound play fails
      });
    } catch (e) {
      // Ignore sound errors
    }
  }

  /**
   * Show notification toast
   */
  showNotification(message: string, type: 'success' | 'error') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10B981' : '#EF4444'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  openAddModal() {
    // Reset form with default transaction type from settings
    this.resetForm();
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
    this.resetForm();
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingTransaction = {};
    this.editingTransactionId = '';
  }

  resetForm() {
    const appSettings = this.settingsService.getAppSettings();
    this.newTransaction = {
      type: appSettings.defaultTransactionType as 'expense' | 'revenue',
      amount: 0,
      category: '',
      description: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  getCategories() {
    return this.newTransaction.type === 'expense' ? this.categories.expense : this.categories.revenue;
  }

  getEditCategories() {
    return this.editingTransaction.type === 'expense' ? this.categories.expense : this.categories.revenue;
  }

  /**
   * Get all unique categories for filter dropdown
   */
  getAllCategories(): string[] {
    const allCategories = new Set<string>();
    this.transactions.forEach(t => allCategories.add(t.category));
    return Array.from(allCategories).sort();
  }

  /**
   * Format currency using settings service
   */
  formatCurrency(amount: number): string {
    return this.settingsService.formatCurrency(amount);
  }

  /**
   * Format date using settings service
   */
  formatDate(date: Date | string): string {
    return this.settingsService.formatDate(date);
  }

  /**
   * Format date for input field (always YYYY-MM-DD for HTML5 date input)
   */
  formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get currency symbol for display
   */
  getCurrencySymbol(): string {
    return this.settingsService.getCurrencySymbol();
  }

  /**
   * Calculate total for current filter
   */
  getTotalAmount(): number {
    return this.filteredTransactions
      .reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0);
  }

  /**
   * Calculate total expenses for current filter
   */
  getTotalExpenses(): number {
    return this.filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Calculate total revenue for current filter
   */
  getTotalRevenue(): number {
    return this.filteredTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Export filtered transactions
   */
  exportTransactions() {
    const appSettings = this.settingsService.getAppSettings();

    const exportData = {
      transactions: this.filteredTransactions.map(t => ({
        date: this.formatDate(t.createdAt),
        type: t.type,
        category: t.category,
        description: t.description,
        amount: this.formatCurrency(t.amount)
      })),
      summary: {
        totalExpenses: this.formatCurrency(this.getTotalExpenses()),
        totalRevenue: this.formatCurrency(this.getTotalRevenue()),
        net: this.formatCurrency(this.getTotalAmount()),
        count: this.filteredTransactions.length
      },
      filters: {
        type: this.selectedType,
        category: this.selectedCategory,
        dateRange: this.dateRange,
        search: this.searchTerm
      },
      exportDate: new Date().toISOString(),
      currency: appSettings.currency
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    this.showNotification('Transactions exported successfully', 'success');
  }
}
