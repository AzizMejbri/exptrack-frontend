import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment.prod';

export interface User {
  id: string;
  username: string;
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
  // private baseUrl = 'https://localhost:8443';
  private baseUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  login(credentials: LoginCredentials): Observable<User> {
    return this.http.post<User>(
      `${this.baseUrl}/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        const user: User = {
          id: response.id.toString(),
          username: response.username,
        };
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
        };
        console.log("Signup successful, user:", user);
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
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
      console.log(this.currentUser$);
      this.router.navigate(['/login']);
    });
  }

  /** Synchronous getter (cached) */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/auth/me`, { withCredentials: true })
      .pipe(
        tap(user => this.currentUserSubject.next(user)),
        catchError(() => {
          this.currentUserSubject.next(null);
          return of(null as any);
        })
      );
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}
