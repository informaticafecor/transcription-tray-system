// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * GET request - devuelve el tipo adecuado según 'observe'
   */
  get<T>(endpoint: string, options?: any): Observable<T | HttpResponse<T> | HttpEvent<T>> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, options);
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, data: any, options?: any): Observable<T | HttpResponse<T> | HttpEvent<T>> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data, options);
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: any, options?: any): Observable<T | HttpResponse<T> | HttpEvent<T>> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data, options);
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: any): Observable<T | HttpResponse<T> | HttpEvent<T>> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, options);
  }
}
