// ============================================
// src/app/pages/user-dashboard/user-dashboard.component.ts
// ============================================
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UploadComponent } from '../../components/upload/upload.component';
import { AudioListComponent } from '../../components/audio-list/audio-list.component';
import { AuthService } from '../../services/auth.service';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, UploadComponent, AudioListComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit {
  @ViewChild(AudioListComponent) audioList!: AudioListComponent;

  userName = '';
  stats: any = null;

  constructor(
    private authService: AuthService,
    private audioService: AudioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.email.split('@')[0];
    }
    this.loadStats();
  }

  loadStats(): void {
    this.audioService.getStats().subscribe({
      next: (response) => {
        this.stats = response.data;
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
      }
    });
  }

  onUploadComplete(): void {
    this.audioList.loadAudios();
    this.loadStats();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}