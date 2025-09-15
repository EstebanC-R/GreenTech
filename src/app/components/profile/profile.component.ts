import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;
  isLoading = false;
  errorMessage = '';
  showLogoutConfirm = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getUserProfile().subscribe({
      next: (response) => {
          if (response.email) {
            this.userProfile = {
                email: response.email,
                rol: response.rol!,
                // Convertir Date a string si es necesario
                fechaIngreso: response.fechaIngreso instanceof Date 
                    ? response.fechaIngreso.toISOString() 
                    : response.fechaIngreso!,
                estado: response.estado!
            };
          } else {
            this.errorMessage = response.message || 'Error al cargar el perfil';
          }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
        this.errorMessage = 'Error al cargar el perfil del usuario';
        this.isLoading = false;
        
        if (error.status === 401) {
          this.authService.logout().subscribe({
            next: () => this.router.navigate(['/login']),
            error: () => {
              this.authService.clearAuthData();
              this.router.navigate(['/login']);
            }
          });
        }
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getRolDisplayName(rol: string): string {
    switch (rol) {
      case 'ADMIN': return 'Administrador';
      case 'EMPLEADO': return 'Empleado';
      case 'SUPERVISOR': return 'Supervisor';
      default: return rol;
    }
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'ACTIVO': return 'status-active';
      case 'INACTIVO': return 'status-inactive';
      default: return 'status-unknown';
    }
  }

  showLogoutConfirmation(): void {
    this.showLogoutConfirm = true;
  }

  cancelLogout(): void {
    this.showLogoutConfirm = false;
  }


  confirmLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout exitoso');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error en logout:', error);
        this.authService.clearAuthData();
        this.router.navigate(['/login']);
      }
    });
  }

  refreshProfile(): void {
    this.loadUserProfile();
  }
}
