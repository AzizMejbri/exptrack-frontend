import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../auth/auth';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  isActive: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private currUser: User | null;
  public menuItems: MenuItem[]
  constructor(private router: Router, private authService: AuthService) {

    this.currUser = this.authService.getCurrentUser()
    this.menuItems = [
      { label: 'Dashboard', icon: '📊', route: `/dashboard/${this.currUser?.id}`, isActive: false },
      { label: 'Transactions', icon: '💳', route: `/transactions/${this.currUser?.id}`, isActive: false },
      { label: 'Category Stats', icon: '📈', route: `/category-stats/${this.currUser?.id}`, isActive: false },
      { label: 'Reports', icon: '📋', route: `/reports/${this.currUser?.id}`, isActive: false },
      { label: 'Settings', icon: '⚙️', route: `/settings/${this.currUser?.id}`, isActive: false }
    ];

    this.updateActiveState();
    this.router.events.subscribe(() => {
      this.updateActiveState();
    });

  }
  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  private updateActiveState() {
    const currentRoute = this.router.url;
    this.menuItems.forEach(item => {
      item.isActive = currentRoute === item.route ||
        currentRoute.startsWith(item.route + '/');
    });
  }
}
