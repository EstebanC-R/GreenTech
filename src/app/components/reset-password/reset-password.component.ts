import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, ResetPasswordRequest } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  message = '';
  isSuccess = false;
  isValidToken = false;
  isCheckingToken = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener token de la URL
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.showMessage('Token de restablecimiento no válido', false);
      this.isCheckingToken = false;
      return;
    }

    // Validar token
    this.validateToken();
  }

  private validateToken(): void {
    this.authService.validateResetToken(this.token).subscribe({
      next: (response) => {
        this.isValidToken = response.success;
        this.isCheckingToken = false;
        if (!response.success) {
          this.showMessage(response.message, false);
        }
      },
      error: (error) => {
        this.isCheckingToken = false;
        this.isValidToken = false;
        
        let errorMessage = 'Token inválido o expirado';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.showMessage(errorMessage, false);
      }
    });
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.clearMessage();

    const request: ResetPasswordRequest = {
      token: this.token,
      newPassword: this.newPassword
    };

    this.authService.resetPassword(request).subscribe({
      next: (response) => {
        this.isSuccess = response.success;
        this.showMessage(response.message, response.success);
        this.isLoading = false;

        if (response.success) {
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
      },
      error: (error) => {
        console.error('Error en reset password:', error);
        
        let errorMessage = 'Error inesperado. Intenta de nuevo.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Error de conexión con el servidor';
        }

        this.showMessage(errorMessage, false);
        this.isLoading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.newPassword) {
      this.showMessage('Por favor ingresa una nueva contraseña', false);
      return false;
    }

    if (this.newPassword.length < 6) {
      this.showMessage('La contraseña debe tener al menos 6 caracteres', false);
      return false;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showMessage('Las contraseñas no coinciden', false);
      return false;
    }

    return true;
  }

  private showMessage(message: string, success: boolean): void {
    this.message = message;
    this.isSuccess = success;
  }

  private clearMessage(): void {
    this.message = '';
    this.isSuccess = false;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}