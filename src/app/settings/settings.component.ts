import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../theme.service';
import { Router } from '@angular/router';

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

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  // Preferences
  preferences: AppSettings = {
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    startOfWeek: 'Monday',
    defaultTransactionType: 'expense',
    enableNotifications: true,
    budgetAlerts: true,
    autoSync: true
  };

  // Budget Settings
  budgetSettings: BudgetSettings = {
    monthlyBudget: 3000,
    enableBudgetAlerts: true,
    alertThreshold: 80,
    weeklyBudget: 750,
    categories: [
      { name: 'Food', budget: 500, spent: 320 },
      { name: 'Transport', budget: 200, spent: 180 },
      { name: 'Entertainment', budget: 150, spent: 75 }
    ]
  };

  currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CHF', 'CNY', 'BRL'];
  dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY'];
  weekStarts = ['Monday', 'Sunday', 'Saturday'];

  // Theme
  isDarkMode = false;

  // UI State
  activeTab = 'general';

  constructor(
    private themeService: ThemeService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadSettings();
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  loadSettings() {
    const savedPreferences = localStorage.getItem('expenseTrackerPreferences');
    const savedBudget = localStorage.getItem('expenseTrackerBudget');

    if (savedPreferences) {
      try {
        this.preferences = { ...this.preferences, ...JSON.parse(savedPreferences) };
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }

    if (savedBudget) {
      try {
        this.budgetSettings = { ...this.budgetSettings, ...JSON.parse(savedBudget) };
      } catch (e) {
        console.error('Error loading budget settings:', e);
      }
    }

    // Apply loaded settings
    this.applySettings();
  }

  applySettings() {
    // Emit settings change event for other components to listen
    window.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: {
        preferences: this.preferences,
        budgetSettings: this.budgetSettings
      }
    }));
  }

  saveSettings() {
    localStorage.setItem('expenseTrackerPreferences', JSON.stringify(this.preferences));
    localStorage.setItem('expenseTrackerBudget', JSON.stringify(this.budgetSettings));
    this.applySettings();
    this.showSuccessMessage('Settings saved successfully!');
  }

  onCurrencyChange() {
    console.log('Currency changed to:', this.preferences.currency);
    this.applySettings();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  addBudgetCategory() {
    this.budgetSettings.categories.push({
      name: 'New Category',
      budget: 0,
      spent: 0
    });
  }

  removeBudgetCategory(index: number) {
    this.budgetSettings.categories.splice(index, 1);
  }

  showSuccessMessage(message: string) {
    const alert = document.createElement('div');
    alert.textContent = message;
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(alert);

    setTimeout(() => {
      alert.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => alert.remove(), 300);
    }, 3000);
  }

  getSpentPercentage(category: BudgetCategory): number {
    if (category.budget === 0) return 0;
    return (category.spent / category.budget) * 100;
  }

  getCategoryStatus(category: BudgetCategory): string {
    const percentage = this.getSpentPercentage(category);
    if (percentage >= 100) return 'over-budget';
    if (percentage >= this.budgetSettings.alertThreshold) return 'near-budget';
    return 'under-budget';
  }
}
