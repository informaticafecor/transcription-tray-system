// ============================================
// src/app/pages/admin-dashboard/admin-dashboard.component.ts
// ============================================
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AudioListComponent } from '../../components/audio-list/audio-list.component';
import { AuthService } from '../../services/auth.service';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AudioListComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  stats: any = null;

  constructor(
    private authService: AuthService,
    private audioService: AudioService,
    private router: Router
  ) {}

  ngOnInit(): void {
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}