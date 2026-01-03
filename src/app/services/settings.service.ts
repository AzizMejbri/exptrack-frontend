import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppSettings {
  currency: string;
  dateFormat: string;
  startOfWeek: string;
  defaultTransactionType: string;
  enableNotifications: boolean;
  budgetAlerts: boolean;
  autoSync: boolean;
}

export interface BudgetSettings {
  monthlyBudget: number;
  enableBudgetAlerts: boolean;
  alertThreshold: number;
  weeklyBudget: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  name: string;
  budget: number;
  spent: number;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly APP_SETTINGS_KEY = 'expenseTrackerPreferences';
  private readonly BUDGET_SETTINGS_KEY = 'expenseTrackerBudget';

  // Default settings
  private defaultAppSettings: AppSettings = {
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    startOfWeek: 'Monday',
    defaultTransactionType: 'expense',
    enableNotifications: true,
    budgetAlerts: true,
    autoSync: true
  };

  private defaultBudgetSettings: BudgetSettings = {
    monthlyBudget: 3000,
    enableBudgetAlerts: true,
    alertThreshold: 80,
    weeklyBudget: 750,
    categories: []
  };

  // Observables for reactive updates
  private appSettingsSubject: BehaviorSubject<AppSettings>;
  private budgetSettingsSubject: BehaviorSubject<BudgetSettings>;

  public appSettings$: Observable<AppSettings>;
  public budgetSettings$: Observable<BudgetSettings>;

  constructor() {
    // Load settings from localStorage
    const savedAppSettings = this.loadAppSettings();
    const savedBudgetSettings = this.loadBudgetSettings();

    // Initialize subjects
    this.appSettingsSubject = new BehaviorSubject<AppSettings>(savedAppSettings);
    this.budgetSettingsSubject = new BehaviorSubject<BudgetSettings>(savedBudgetSettings);

    // Create observables
    this.appSettings$ = this.appSettingsSubject.asObservable();
    this.budgetSettings$ = this.budgetSettingsSubject.asObservable();

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  /**
   * Load app settings from localStorage
   */
  private loadAppSettings(): AppSettings {
    try {
      const saved = localStorage.getItem(this.APP_SETTINGS_KEY);
      if (saved) {
        return { ...this.defaultAppSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
    return { ...this.defaultAppSettings };
  }

  /**
   * Load budget settings from localStorage
   */
  private loadBudgetSettings(): BudgetSettings {
    try {
      const saved = localStorage.getItem(this.BUDGET_SETTINGS_KEY);
      if (saved) {
        return { ...this.defaultBudgetSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading budget settings:', error);
    }
    return { ...this.defaultBudgetSettings };
  }

  /**
   * Get current app settings
   */
  getAppSettings(): AppSettings {
    return this.appSettingsSubject.value;
  }

  /**
   * Get current budget settings
   */
  getBudgetSettings(): BudgetSettings {
    return this.budgetSettingsSubject.value;
  }

  /**
   * Update app settings
   */
  updateAppSettings(settings: Partial<AppSettings>): void {
    const currentSettings = this.appSettingsSubject.value;
    const newSettings = { ...currentSettings, ...settings };

    localStorage.setItem(this.APP_SETTINGS_KEY, JSON.stringify(newSettings));
    this.appSettingsSubject.next(newSettings);

    this.emitSettingsChangeEvent();
  }

  /**
   * Update budget settings
   */
  updateBudgetSettings(settings: Partial<BudgetSettings>): void {
    const currentSettings = this.budgetSettingsSubject.value;
    const newSettings = { ...currentSettings, ...settings };

    localStorage.setItem(this.BUDGET_SETTINGS_KEY, JSON.stringify(newSettings));
    this.budgetSettingsSubject.next(newSettings);

    this.emitSettingsChangeEvent();
  }

  /**
   * Reset to default settings
   */
  resetToDefaults(): void {
    localStorage.removeItem(this.APP_SETTINGS_KEY);
    localStorage.removeItem(this.BUDGET_SETTINGS_KEY);

    this.appSettingsSubject.next({ ...this.defaultAppSettings });
    this.budgetSettingsSubject.next({ ...this.defaultBudgetSettings });

    this.emitSettingsChangeEvent();
  }

  /**
   * Emit custom event for non-Angular components
   */
  private emitSettingsChangeEvent(): void {
    window.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: {
        preferences: this.appSettingsSubject.value,
        budgetSettings: this.budgetSettingsSubject.value
      }
    }));
  }

  /**
   * Handle storage changes from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === this.APP_SETTINGS_KEY && event.newValue) {
      try {
        const newSettings = JSON.parse(event.newValue);
        this.appSettingsSubject.next({ ...this.defaultAppSettings, ...newSettings });
      } catch (error) {
        console.error('Error parsing app settings from storage event:', error);
      }
    } else if (event.key === this.BUDGET_SETTINGS_KEY && event.newValue) {
      try {
        const newSettings = JSON.parse(event.newValue);
        this.budgetSettingsSubject.next({ ...this.defaultBudgetSettings, ...newSettings });
      } catch (error) {
        console.error('Error parsing budget settings from storage event:', error);
      }
    }
  }

  /**
   * Format currency based on current settings
   */
  formatCurrency(amount: number | null | undefined): string {
    const value = amount ?? 0;
    const settings = this.getAppSettings();

    const currencyLocales: { [key: string]: string } = {
      'USD': 'en-US',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'JPY': 'ja-JP',
      'CAD': 'en-CA',
      'AUD': 'en-AU',
      'INR': 'en-IN',
      'CHF': 'de-CH',
      'CNY': 'zh-CN',
      'BRL': 'pt-BR'
    };

    const locale = currencyLocales[settings.currency] || 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: settings.currency
    }).format(value);
  }

  /**
   * Format date based on current settings
   */
  formatDate(date: Date | string): string {
    const dateObj = new Date(date);
    const settings = this.getAppSettings();

    switch (settings.dateFormat) {
      case 'MM/DD/YYYY':
        return dateObj.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });

      case 'DD/MM/YYYY':
        return dateObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

      case 'YYYY-MM-DD':
        return dateObj.toISOString().split('T')[0];

      case 'DD-MMM-YYYY':
        return dateObj.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

      default:
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
    }
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(): string {
    const settings = this.getAppSettings();
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'INR': '₹',
      'CHF': 'CHF',
      'CNY': '¥',
      'BRL': 'R$'
    };

    return symbols[settings.currency] || settings.currency;
  }

  /**
   * Check if budget alerts should be shown
   */
  shouldShowBudgetAlerts(): boolean {
    const appSettings = this.getAppSettings();
    const budgetSettings = this.getBudgetSettings();

    return appSettings.budgetAlerts && budgetSettings.enableBudgetAlerts;
  }

  /**
   * Request notification permission if enabled
   */
  requestNotificationPermission(): void {
    const settings = this.getAppSettings();

    if (settings.enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  /**
   * Show notification if enabled
   */
  showNotification(title: string, body: string, icon?: string): void {
    const settings = this.getAppSettings();

    if (settings.enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon });
    }
  }
}
