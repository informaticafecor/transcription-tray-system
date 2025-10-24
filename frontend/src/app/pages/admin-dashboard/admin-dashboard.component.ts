// ============================================
// src/app/pages/admin-dashboard/admin-dashboard.component.ts
// ============================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
export class AdminDashboardComponent implements OnInit, OnDestroy {
  stats: any = null;
  
  // ========== AGREGAR POLLING ==========
  private statsPollingSubscription?: Subscription;
  private statsPollingInterval = interval(10000); // Cada 10 segundos
  // =====================================

  constructor(
    private authService: AuthService,
    private audioService: AudioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.startStatsPolling(); // ✅ Iniciar polling
  }

  // ========== AGREGAR MÉTODO DE CLEANUP ==========
  ngOnDestroy(): void {
    this.stopStatsPolling();
  }
  // ==============================================

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

  // ========== MÉTODOS NUEVOS PARA POLLING ==========
  startStatsPolling(): void {
    this.statsPollingSubscription = this.statsPollingInterval
      .pipe(
        switchMap(() => this.audioService.getStats())
      )
      .subscribe({
        next: (response) => {
          this.stats = response.data;
        },
        error: (error) => {
          console.error('Error en polling de estadísticas:', error);
        }
      });
  }

  stopStatsPolling(): void {
    if (this.statsPollingSubscription) {
      this.statsPollingSubscription.unsubscribe();
    }
  }
  // ================================================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}