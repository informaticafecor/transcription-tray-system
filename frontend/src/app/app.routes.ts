// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { UserDashboardComponent } from './pages/user-dashboard/user-dashboard.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/user/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'user/dashboard',
    component: UserDashboardComponent
  },
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent
  },
  {
    path: '**',
    redirectTo: '/user/dashboard'
  }
];