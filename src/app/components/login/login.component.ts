import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, LoginRequest } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials: LoginRequest = {
    email: '',
    password: ''
  };

  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  onSubmit(): void {
    // Validación básica
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = 'Por favor, completa todos los campos';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        
        if (response.token) {
          
          // Pequeño delay para asegurar que localStorage se actualice
          setTimeout(() => {
            // Verificar que los datos se guardaron correctamente
            const savedUser = localStorage.getItem('user');
            const savedToken = localStorage.getItem('token');
          
            
            if (savedUser && savedToken) {
              
              // Obtener la URL de retorno si existe
              const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
              console.log('Redirigiendo a:', returnUrl);
              
              // Navegar al dashboard o a la URL solicitada
              this.router.navigate([returnUrl]).then(
                (success) => {
                  if (success) {
                    console.log('Navegación exitosa a:', returnUrl);
                  } else {
                    console.log('Error en navegación, intentando dashboard por defecto');
                    this.router.navigate(['/dashboard']);
                  }
                  this.isLoading = false;
                }
              );
            } else {
              console.error('Error guardando datos de usuario');
              this.errorMessage = 'Error interno: No se pudieron guardar los datos de sesión';
              this.isLoading = false;
            }
          }, 500); // 500ms de delay
          
        } else {
          console.error('No se recibió token');
          this.errorMessage = response.message || 'Error de autenticación: No se recibió token';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error en login:', error);
        // Manejar diferentes tipos de error
        if (error.status === 401) {
          this.errorMessage = 'Email o contraseña incorrectos';
        } else if (error.status === 0) {
          this.errorMessage = 'Error de conexión. Verifica tu internet';
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Error interno del servidor';
        }
        
        this.isLoading = false;
      }
    });
  }

  clearError(): void {
    this.errorMessage = '';
  }

  // Método adicional para debug
  private debugNavigationState(): void {
    console.log('Estado de autenticación:', this.authService.isAuthenticated());
    console.log('Token actual:', this.authService.getToken() ? 'Presente' : 'Ausente');
    console.log('Usuario actual:', this.authService.getCurrentUser());
  }
}