// src/app/components/upload/upload.component.ts - CORREGIDO COMPLETO
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../services/audio.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  @Output() uploadComplete = new EventEmitter<void>();

  selectedFile: File | null = null;
  uploading = false;
  uploadProgress = 0;
  errorMessage = '';
  successMessage = '';
  maxFileSize = environment.maxFileSize;

  constructor(private audioService: AudioService) {
    console.log('UploadComponent inicializado');
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      console.log('✅ Archivo seleccionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      if (file.size > this.maxFileSize) {
        this.errorMessage = `El archivo excede el tamaño máximo permitido (${this.maxFileSize / 1024 / 1024} MB)`;
        this.selectedFile = null;
        console.error('❌ Archivo demasiado grande');
        return;
      }

      this.selectedFile = file;
      this.errorMessage = '';
      this.successMessage = '';
      
      console.log('✅ Archivo listo para subir');
    }
  }

  uploadFile(): void {
    console.log('🚀 uploadFile() LLAMADO');
    console.log('📁 selectedFile:', this.selectedFile);
    
    if (!this.selectedFile) {
      this.errorMessage = 'Por favor selecciona un archivo';
      console.error('❌ No hay archivo seleccionado');
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📤 Iniciando subida al servidor:', this.selectedFile.name);

    this.audioService.uploadAudio(this.selectedFile).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        this.uploading = false;
        this.uploadProgress = 100;
        this.successMessage = response.message || 'Audio subido exitosamente';
        
        const tempFileName = this.selectedFile?.name;
        this.selectedFile = null;
        
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }

        console.log('✅ Archivo subido exitosamente:', tempFileName);

        setTimeout(() => {
          this.uploadComplete.emit();
          this.successMessage = '';
          console.log('✅ Upload complete event emitido');
        }, 1500);
      },
      error: (error) => {
        console.error('❌ ERROR COMPLETO:', error);
        console.error('❌ Error response:', error.error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        
        this.uploading = false;
        this.uploadProgress = 0;
        
        let errorMsg = 'Error al subir el archivo';
        if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        this.errorMessage = errorMsg;
        console.error('❌ Error mostrado al usuario:', this.errorMessage);
      },
      complete: () => {
        console.log('🏁 Upload completado o finalizado');
      }
    });
  }

  clearSelection(): void {
    console.log('🗑️ Limpiando selección');
    this.selectedFile = null;
    this.errorMessage = '';
    this.successMessage = '';
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }
}