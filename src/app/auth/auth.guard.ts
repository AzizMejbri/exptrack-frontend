import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';
import { AuthService } from './auth';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    console.log('AuthGuard checking...');

    // CASE 1: Already have user in memory/localStorage
    if (this.authService.getCurrentUser()) {
      console.log('AuthGuard: User found in memory');
      return true;
    }

    // CASE 2: Try to fetch user from backend (for page refresh)
    console.log('AuthGuard: No user in memory, fetching from backend...');
    return this.authService.fetchCurrentUser().pipe(
      map(user => {
        console.log('AuthGuard: Fetched user successfully');
        return !!user; // Convert to boolean
      }),
      catchError(() => {  // Removed unused 'error' parameter
        console.log('AuthGuard: Failed to fetch user, redirecting to login');
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: state.url }
        });
        return of(false);
      })
    );
  }
}
