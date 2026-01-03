
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth';
import { ThemeService } from '../theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  isDropdownOpen = false;

  private themeSubscription!: Subscription;

  username = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService
  ) { }

  ngOnInit() {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => (this.isDarkMode = isDark)
    );

    // 🔹 Get authenticated user
    const user = this.authService.getCurrentUser();
    this.username = user?.username ?? 'User';
  }

  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // 🔹 Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.isDropdownOpen = false;
    }
  }

  ngOnDestroy() {
    this.themeSubscription?.unsubscribe();
  }
}
