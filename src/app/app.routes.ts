import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { SignupComponent } from './signup/signup';
import { AuthGuard } from './auth/auth.guard';
import { NgModule } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LayoutComponent } from './layout/layout.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { CategoryStatsComponent } from './category-stats/category-stats.component';
import { ReportsComponent } from './reports/reports.component';
import { SettingsComponent } from './settings/settings.component';
import { UserIdMatcherGuard } from './guards/user-id-matcher.guard';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [UserIdMatcherGuard],
    children: [
      { path: 'dashboard/:userId', component: DashboardComponent, },
      { path: 'transactions/:userId', component: TransactionsComponent },
      { path: 'category-stats/:userId', component: CategoryStatsComponent },
      { path: 'reports/:userId', component: ReportsComponent },
      { path: 'settings/:userId', component: SettingsComponent },
      { path: '', redirectTo: 'dashboard/:userId', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
