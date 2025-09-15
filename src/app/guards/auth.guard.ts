import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(
        route?: ActivatedRouteSnapshot,
        state?: RouterStateSnapshot
    ): boolean {
        // Intentar ambos métodos de verificación de autenticación
        // para compatibilidad con diferentes versiones del AuthService
        const isAuthenticated = this.checkAuthentication();
        
        if (isAuthenticated) {
            return true;
        } else {
            // Guardar la URL que el usuario quería acceder (opcional)
            const returnUrl = state?.url || route?.url?.join('/') || '';
        
            // Redirigir al login
            if (returnUrl) {
                this.router.navigate(['/login'], { 
                    queryParams: { returnUrl } 
                });
            } else {
                this.router.navigate(['/login']);
            }
        
            return false;
        }
    }

    /**
     * Método privado para verificar autenticación
     * Intenta ambos métodos por compatibilidad
     */
    private checkAuthentication(): boolean {
        // Verificar si existe el método isLoggedIn
        if (typeof this.authService.isLoggedIn === 'function') {
            return this.authService.isLoggedIn();
        }
    
        // Verificar si existe el método isAuthenticated
        if (typeof this.authService.isAuthenticated === 'function') {
            return this.authService.isAuthenticated();
        }
    
        // Si ninguno existe, asumir no autenticado
        console.warn('AuthGuard: No se encontraron métodos de autenticación válidos en AuthService');
        return false;
    }
}