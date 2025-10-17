import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Cargar el usuario desde el almacenamiento local (si existe)
   */
  private loadUserFromStorage(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch {
        this.logout();
      }
    }
  }

  /**
   * Obtener el token JWT almacenado
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Establecer el token manualmente (por integración externa)
   */
  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  /**
   * Establecer el usuario manualmente (cuando venga desde otro sistema)
   */
  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Obtener el usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Eliminar la sesión actual
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  /**
   * Verificar si hay token
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Verificar si es administrador
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }
}


//cambie codigo 