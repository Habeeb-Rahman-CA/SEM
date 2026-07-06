import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of } from 'rxjs';

export interface User {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3001/api/auth';

  // Signals for reactive auth state
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  token = signal<string | null>(null);

  constructor() {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      this.token.set(savedToken);
      this.currentUser.set(JSON.parse(savedUser));
      this.isAuthenticated.set(true);
      
      // Optionally verify token validity by fetching profile
      this.fetchProfile().subscribe({
        error: () => this.logout() // Logout if token is expired/invalid
      });
    }
  }

  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        this.token.set(response.accessToken);
        this.currentUser.set(response.user);
        this.isAuthenticated.set(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  fetchProfile(): Observable<User> {
    const currentToken = this.token();
    if (!currentToken) {
      return throwError(() => new Error('No token found'));
    }

    return this.http.get<User>(`${this.apiUrl}/profile`, {
      headers: {
        Authorization: `Bearer ${currentToken}`
      }
    }).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem('user', JSON.stringify(user));
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  updateProfile(username?: string, avatarUrl?: string): Observable<User> {
    const currentToken = this.token();
    return this.http.patch<User>(`${this.apiUrl}/profile`, { username, avatarUrl }, {
      headers: {
        Authorization: `Bearer ${currentToken}`
      }
    }).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }
}
