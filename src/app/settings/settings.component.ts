import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../theme.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  // User Profile
  userProfile = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    profilePicture: null as string | null
  };

  // Preferences
  preferences = {
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    startOfWeek: 'Monday',
    defaultTransactionType: 'expense',
    enableNotifications: true,
    biometricLogin: false,
    autoSync: true,
    budgetAlerts: true,
    saveTransaction: true
  };

  // Budget Settings
  budgetSettings = {
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

  // Export/Import
  exportOptions = {
    format: 'CSV',
    includeAllData: true,
    dateRange: 'all'
  };

  // Data Management
  dataManagement = {
    backupFrequency: 'weekly',
    cloudBackup: true,
    autoDeleteOldData: false,
    deleteAfterMonths: 12
  };

  currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR'];
  dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
  weekStarts = ['Monday', 'Sunday'];
  exportFormats = ['CSV', 'Excel', 'JSON', 'PDF'];

  // Theme
  isDarkMode = false;

  // UI State
  activeTab = 'general';
  showPasswordModal = false;
  showDeleteConfirmation = false;
  isLoading = false;

  constructor(
    private themeService: ThemeService,
    private router: Router
  ) { }

  ngOnInit() {
    // Load user preferences from localStorage if available
    this.loadSettings();

    // Subscribe to theme changes
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  loadSettings() {
    const savedSettings = localStorage.getItem('expenseTrackerSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        this.preferences = { ...this.preferences, ...settings };
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }

  saveSettings() {
    localStorage.setItem('expenseTrackerSettings', JSON.stringify(this.preferences));
    this.showSuccessMessage('Settings saved successfully!');
  }

  onCurrencyChange() {
    console.log('Currency changed to:', this.preferences.currency);
    // You can add additional logic here, like updating all displayed currencies
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

  exportData() {
    this.isLoading = true;

    // Simulate export process
    setTimeout(() => {
      const data = {
        preferences: this.preferences,
        budget: this.budgetSettings,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      window.URL.revokeObjectURL(url);
      this.isLoading = false;
      this.showSuccessMessage('Data exported successfully!');
    }, 1000);
  }

  importData(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          // Validate and apply imported data
          if (data.preferences) {
            this.preferences = { ...this.preferences, ...data.preferences };
          }
          if (data.budget) {
            this.budgetSettings = { ...this.budgetSettings, ...data.budget };
          }
          this.showSuccessMessage('Data imported successfully!');
        } catch (error) {
          this.showErrorMessage('Error importing data. Invalid file format.');
        }
      };
      reader.readAsText(file);
    }
  }

  backupData() {
    localStorage.setItem('expenseTrackerBackup', JSON.stringify({
      timestamp: new Date().toISOString(),
      data: {
        preferences: this.preferences,
        budget: this.budgetSettings
      }
    }));
    this.showSuccessMessage('Backup created successfully!');
  }

  restoreData() {
    const backup = localStorage.getItem('expenseTrackerBackup');
    if (backup) {
      try {
        const data = JSON.parse(backup);
        if (data.data.preferences) {
          this.preferences = { ...this.preferences, ...data.data.preferences };
        }
        if (data.data.budget) {
          this.budgetSettings = { ...this.budgetSettings, ...data.data.budget };
        }
        this.showSuccessMessage('Data restored successfully!');
      } catch (error) {
        this.showErrorMessage('Error restoring backup.');
      }
    } else {
      this.showErrorMessage('No backup found.');
    }
  }

  clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.removeItem('expenseTrackerSettings');
      localStorage.removeItem('expenseTrackerBackup');
      this.showSuccessMessage('All data cleared successfully!');
      // Reset to defaults
      this.ngOnInit();
    }
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      // In a real app, you would clear auth tokens here
      this.router.navigate(['/login']);
    }
  }

  changePassword() {
    this.showPasswordModal = true;
  }

  updatePassword(newPassword: string) {
    // In a real app, you would send this to your backend
    console.log('Password updated');
    this.showPasswordModal = false;
    this.showSuccessMessage('Password updated successfully!');
  }

  showSuccessMessage(message: string) {
    // Create a temporary success message
    const alert = document.createElement('div');
    alert.className = 'success-alert';
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
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(alert);

    setTimeout(() => {
      alert.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => alert.remove(), 300);
    }, 3000);
  }

  showErrorMessage(message: string) {
    // Create a temporary error message
    const alert = document.createElement('div');
    alert.className = 'error-alert';
    alert.textContent = message;
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(alert);

    setTimeout(() => {
      alert.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => alert.remove(), 300);
    }, 3000);
  }

  getSpentPercentage(category: any): number {
    return (category.spent / category.budget) * 100;
  }

  getCategoryStatus(category: any): string {
    const percentage = this.getSpentPercentage(category);
    if (percentage >= 100) return 'over-budget';
    if (percentage >= 80) return 'near-budget';
    return 'under-budget';
  }
}
