// ============================================
// src/app/services/audio.service.ts - COMPLETO
// ============================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  Audio, 
  AudioUploadResponse, 
  AudioListResponse, 
  StatsResponse,
  AudioStatus 
} from '../models/audio.model';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  uploadAudio(file: File): Observable<AudioUploadResponse> {
    const formData = new FormData();
    formData.append('audio', file);
    
    return this.http.post<AudioUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  getUserAudios(status?: AudioStatus, limit: number = 50, offset: number = 0): Observable<AudioListResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<AudioListResponse>(`${this.apiUrl}/my-audios`, { params });
  }

  getAllAudios(
    status?: AudioStatus, 
    userId?: string,
    limit: number = 50, 
    offset: number = 0
  ): Observable<AudioListResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    if (status) params = params.set('status', status);
    if (userId) params = params.set('userId', userId);

    return this.http.get<AudioListResponse>(`${this.apiUrl}/admin/audios`, { params });
  }                             

  getAudioById(id: string): Observable<{ success: boolean; data: Audio }> {
    return this.http.get<{ success: boolean; data: Audio }>(`${this.apiUrl}/audios/${id}`);
  }

  deleteAudio(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/audios/${id}`);
  }

  getStats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.apiUrl}/stats`);
  }

  /**
   * Descarga el archivo Word de transcripción directamente
   * @param id ID del audio
   * @returns Observable con el archivo como Blob
   */
  downloadTranscription(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/audios/${id}/download`, {
      responseType: 'blob', // Importante: recibir como Blob
    });
}


}
