import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, ForgotPasswordRequest } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  isLoading = false;
  message = '';
  isSuccess = false;
  isSubmitted = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.email) {
      this.showMessage('Por favor ingresa tu email', false);
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.showMessage('Por favor ingresa un email válido', false);
      return;
    }

    this.isLoading = true;
    this.clearMessage();

    const request: ForgotPasswordRequest = {
      email: this.email
    };

    this.authService.forgotPassword(request).subscribe({
      next: (response) => {
        this.isSubmitted = true;
        this.showMessage(response.message, response.success);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error en forgot password:', error);
        
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

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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