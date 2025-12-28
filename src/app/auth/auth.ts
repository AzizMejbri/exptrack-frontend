import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  username: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = 'https://localhost:8443';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  login(credentials: LoginCredentials): Observable<User> {
    console.log("login Working");
    return this.http.post<User>(
      `${this.baseUrl}/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        const user: User = {
          id: response.id.toString(),
          username: response.username,
          email: response.email
        };
        console.log("Login successful, user:", user);
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  signup(credentials: SignupCredentials): Observable<User> {
    return this.http.post<User>(
      `${this.baseUrl}/auth/signup`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        const user: User = {
          id: response.id.toString(),
          username: response.username,
          email: response.email
        };
        console.log("Signup successful, user:", user);
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  // ADD THIS METHOD: Fetch current user from backend
  fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(
      `${this.baseUrl}/api/current-user`,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        const user: User = {
          id: response.id.toString(),
          username: response.username,
          email: response.email
        };
        console.log("Fetched current user:", user);
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to fetch current user:', error);
        return of(null as any); // Return empty observable on error
      })
    );
  }

  logout(): void {
    this.http.post(
      `${this.baseUrl}/auth/logout`,
      {},
      { withCredentials: true }
    ).subscribe(() => {
      this.currentUserSubject.next(null);
      localStorage.removeItem('currentUser');
      this.router.navigate(['/login']);
    });
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}
