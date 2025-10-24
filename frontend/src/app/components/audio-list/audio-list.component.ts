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
  
  // ========== CAMBIO: Aumentar intervalo de polling de 5s a 10s ==========
  private pollingInterval = interval(10000); // 10 segundos (antes era 5000)
  // =======================================================================

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
    this.pollingSubscription = this.pollingInterval
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

  // ========== MÉTODO NUEVO PARA DESCARGAR WORD ==========
  /**
   * Descarga el archivo Word directamente desde el backend
   */
  downloadWord(audio: Audio): void {
    if (!audio.driveTranscriptionFileId) {
      alert('❌ El archivo de transcripción no está disponible');
      return;
    }

    console.log('📥 Iniciando descarga de Word:', audio.originalFilename);

    // Mostrar indicador de carga (opcional)
    const audioId = audio.id;

    // Llamar al servicio
    this.audioService.downloadTranscription(audioId).subscribe({
      next: (blob: Blob) => {
        // Crear URL temporal del blob
        const url = window.URL.createObjectURL(blob);

        // Crear elemento <a> temporal para trigger la descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = `${audio.originalFilename.replace(/\.[^/.]+$/, '')}_transcription.docx`;

        // Hacer clic programáticamente
        document.body.appendChild(link);
        link.click();

        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('✅ Descarga completada');
      },
      error: (error) => {
        console.error('❌ Error al descargar:', error);
        alert('Error al descargar el archivo. Por favor intenta de nuevo.');
      },
    });
  }


  // ======================================================

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
      alert('✅ Texto copiado al portapapeles');
    }).catch(err => {
      console.error('❌ Error al copiar:', err);
      alert('Error al copiar el texto');
    });
  }
}