import { Injectable, inject } from '@angular/core';
import {
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';
import { AuthService } from '../auth/auth';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserIdMatcherGuard implements CanActivateChild {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    const requestedUserId = childRoute.params['userId'];
    const currentUser = this.authService.getCurrentUser();

    console.log('UserIdMatcherGuard:');
    console.log('- Requested userId:', requestedUserId);
    console.log('- Current user from service:', currentUser);
    console.log('- Route URL:', state.url);

    // CASE 1: We have current user in memory/localStorage
    if (currentUser) {
      if (currentUser.id === requestedUserId) {
        console.log('SUCCESS: User IDs match');
        return true;
      } else {
        console.log(`REDIRECT: User ${currentUser.id} tried to access ${requestedUserId}`);
        // Redirect to their own dashboard
        this.router.navigate([`/dashboard/${currentUser.id}`]);
        return false;
      }
    }

    // CASE 2: No current user in memory (page refresh or direct URL)
    console.log('No current user in memory, fetching from backend...');
    return this.authService.fetchCurrentUser().pipe(
      map(user => {
        console.log('Fetched user from backend:', user);

        if (user && user.id === requestedUserId) {
          console.log('SUCCESS: Fetched user ID matches requested');
          return true;
        } else if (user) {
          console.log(`REDIRECT: Fetched user ${user.id} doesn't match ${requestedUserId}`);
          this.router.navigate([`/dashboard/${user.id}`]);
          return false;
        } else {
          console.log('No user found, redirecting to login');
          this.router.navigate(['/login']);
          return false;
        }
      }),
      catchError(() => {  // Removed unused 'error' parameter
        console.error('Failed to fetch current user');
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
