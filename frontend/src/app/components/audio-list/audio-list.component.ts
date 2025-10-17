// ============================================
// src/app/components/audio-list/audio-list.component.ts
// ============================================
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AudioService } from '../../services/audio.service';
import { Audio, AudioStatus } from '../../models/audio.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-audio-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-list.component.html',
  styleUrls: ['./audio-list.component.scss']
})
export class AudioListComponent implements OnInit, OnDestroy {
  @Input() isAdminView = false;

  audios: Audio[] = [];
  loading = false;
  AudioStatus = AudioStatus;
  selectedAudio: Audio | null = null;
  private pollingSubscription?: Subscription;

  constructor(private audioService: AudioService) {}

  ngOnInit(): void {
    this.loadAudios();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadAudios(): void {
    this.loading = true;

    const request$ = this.isAdminView
      ? this.audioService.getAllAudios()
      : this.audioService.getUserAudios();

    request$.subscribe({
      next: (response) => {
        this.audios = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar audios:', error);
        this.loading = false;
      }
    });
  }

  startPolling(): void {
    this.pollingSubscription = interval(environment.pollingInterval)
      .pipe(
        switchMap(() => 
          this.isAdminView
            ? this.audioService.getAllAudios()
            : this.audioService.getUserAudios()
        )
      )
      .subscribe({
        next: (response) => {
          this.audios = response.data;
        },
        error: (error) => {
          console.error('Error en polling:', error);
        }
      });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  selectAudio(audio: Audio): void {
    this.selectedAudio = audio;
  }

  closeModal(): void {
    this.selectedAudio = null;
  }

  deleteAudio(audio: Audio): void {
    if (!confirm(`¿Estás seguro de eliminar el audio "${audio.originalFilename}"?`)) {
      return;
    }

    this.audioService.deleteAudio(audio.id).subscribe({
      next: () => {
        this.audios = this.audios.filter(a => a.id !== audio.id);
        if (this.selectedAudio?.id === audio.id) {
          this.closeModal();
        }
      },
      error: (error) => {
        console.error('Error al eliminar audio:', error);
        alert('Error al eliminar el audio');
      }
    });
  }

  getStatusClass(status: AudioStatus): string {
    switch (status) {
      case AudioStatus.PENDING: return 'status-pending';
      case AudioStatus.PROCESSING: return 'status-processing';
      case AudioStatus.DONE: return 'status-done';
      case AudioStatus.ERROR: return 'status-error';
      default: return '';
    }
  }

  getStatusLabel(status: AudioStatus): string {
    switch (status) {
      case AudioStatus.PENDING: return 'Pendiente';
      case AudioStatus.PROCESSING: return 'Procesando';
      case AudioStatus.DONE: return 'Completado';
      case AudioStatus.ERROR: return 'Error';
      default: return status;
    }
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      alert('Texto copiado al portapapeles');
    });
  }
}