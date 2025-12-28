// transactions.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../services/transaction.service';
import { Transaction } from '../models/transaction.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
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

  categories = {
    expense: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Healthcare'],
    revenue: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other']
  };

  constructor(private transactionService: TransactionService) { }

  ngOnInit() {
    this.loadTransactions();
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
      return;
    }

    const payload = {
      amount: this.newTransaction.amount,
      type: this.newTransaction.type,
      category: this.newTransaction.category,
      description: this.newTransaction.description
    };

    this.transactionService.addTransaction(payload).subscribe({
      next: (createdTransaction) => {
        this.transactions.unshift(createdTransaction);
        this.applyFilters();
        this.closeAddModal();
        this.resetForm();
      },
      error: (err) => {
        console.error('❌ Failed to add transaction', err);
        alert('Failed to add transaction');
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
    console.log('showEditModal is now:', this.showEditModal);
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
      alert('Please fill in all required fields');
      return;
    }

    const payload = {
      amount: this.editingTransaction.amount,
      type: this.editingTransaction.type,
      category: this.editingTransaction.category,
      description: this.editingTransaction.description
    };

    console.log('Updating transaction with payload:', payload);

    // Check if updateTransaction method exists and call it
    // The service likely has: updateTransaction(id: string, type: string, data: any)
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
        },
        error: (err) => {
          console.error('❌ Failed to update transaction', err);
          alert('Failed to update transaction: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
    } else {
      console.error('❌ updateTransaction method not found in service');
      alert('Update functionality not available. Please check TransactionService has updateTransaction method.');
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
        },
        error: (err) => {
          console.error('❌ Failed to delete transaction', err);
          alert('Failed to delete transaction: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
    }
  }

  openAddModal() {
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
    this.newTransaction = {
      type: 'expense',
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
