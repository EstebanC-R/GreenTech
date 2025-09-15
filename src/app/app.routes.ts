import { Routes } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
    },
    {
        path: '',
        component: SidebarComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
            { path: 'cultivos', loadComponent: () => import('./components/cultivos/cultivos.component').then(m => m.CultivosComponent) },
            { path: 'insumos', loadComponent: () => import('./components/insumos/insumos.component').then(m => m.InsumosComponent) },
            { path: 'vista-reportes', loadComponent: () => import('./components/vista-reportes/vista-reportes.component').then(m => m.VistaReportesComponent) },
            { path: 'observaciones', loadComponent: () => import('./components/observaciones/observaciones.component').then(m => m.ObservacionesComponent) },
            { path: 'empleados', loadComponent: () => import('./components/empleados/empleados.component').then(m => m.EmpleadosComponent) },
            { path: 'profile', loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent) }
        ]
    },
    // Para manejar rutas no encontradas
    { path: '**', redirectTo: 'login' }
];