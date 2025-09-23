import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';


export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success?: boolean;
    token: string | null;
    email: string | null;
    rol: string | null;
    user?: User;
    message: string | null;
}

export interface User {
    email: string;
    rol: string;
}

export interface UserProfile {
    email: string;
    rol: string;
    fechaIngreso: string;
    estado: string;
    adminAsignado?: string;
    adminEfectivo?: string; 
}

// Actualizada para coincidir con el backend Java
export interface UserProfileResponse {
    message: string;
    email: string | null;
    rol: string | null;
    fechaIngreso: Date | string;  // Mantenido como Date | string de tu versión
    estado: string | null;
    adminAsignado: string | null;  // Mantenido de tu versión
    adminEfectivo: string | null;  // Mantenido de tu versión
}

// Interfaces nuevas del segundo archivo
export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface ApiResponse {
    message: string;
    success: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = environment.authUrl;
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    private tokenSubject = new BehaviorSubject<string | null>(null);
    
    public currentUser$ = this.currentUserSubject.asObservable();
    public token$ = this.tokenSubject.asObservable();

    constructor(
        private http: HttpClient,
        private router: Router
    ) {
        this.checkStoredAuth();
    }

    // Método de login principal
    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
            .pipe(
                tap(response => {
                    if (response.token) {
                        this.saveAuthData(response);
                    }
                })
            );
    }

    // Método de registro
    register(userData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/register`, userData);
    }

    // Guardar datos de autenticación
    saveAuthData(response: LoginResponse): void {
        if (response.token && (response.email || response.user?.email)) {
            const email = response.email || response.user?.email || '';
            const rol = response.rol || response.user?.rol || '';
            
            // Guardar datos individuales
            localStorage.setItem('token', response.token);
            localStorage.setItem('email', email);
            localStorage.setItem('rol', rol);
        
            // IMPORTANTE: Guardar objeto user en formato consistente
            const userObject = {
                email: email,
                rol: rol
            };
            
            localStorage.setItem('user', JSON.stringify(userObject));

            // Actualizar BehaviorSubjects
            this.currentUserSubject.next(userObject);
            this.tokenSubject.next(response.token);
        }
    }

    // Verificar autenticación almacenada
    private checkStoredAuth(): void {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token) {
            this.tokenSubject.next(token);
            
            // Intentar obtener user completo primero
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    this.currentUserSubject.next(user);
                    return;
                } catch (e) {
                    // Error parsing, continuar con fallback
                }
            }

            // Fallback a email y rol separados
            const email = localStorage.getItem('email');
            const rol = localStorage.getItem('rol');
            if (email && rol) {
                const fallbackUser = { email, rol };
                
                // Guardar en formato correcto para futuras sesiones
                localStorage.setItem('user', JSON.stringify(fallbackUser));
                this.currentUserSubject.next(fallbackUser);
            }
        }
    }

    // Logout con petición al servidor
    logout(): Observable<string> {
        const headers = this.getHttpHeaders();
        
        return new Observable(observer => {
            this.http.post<string>(`${this.apiUrl}/logout`, {}, { 
                headers, 
                responseType: 'text' as 'json' 
            }).subscribe({
                next: (response) => {
                    this.clearAuthData();
                    observer.next(response);
                    observer.complete();
                },
                error: (error) => {
                    // Aunque falle la petición, limpiar datos locales
                    this.clearAuthData();
                    observer.error(error);
                }
            });
        });
    }

    // Logout simple (sin petición al servidor)
    logoutLocal(): void {
        this.clearAuthData();
    }

    // Limpiar datos de autenticación
    clearAuthData(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('rol');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
        this.tokenSubject.next(null);
        this.router.navigate(['/login']);
    }

    getUserProfile(): Observable<UserProfileResponse> {
        const headers = this.getHttpHeaders();
        return this.http.get<UserProfileResponse>(`${this.apiUrl}/profile`, { headers });
    }

    // Obtener token
    getToken(): string | null {
        return localStorage.getItem('token');
    }

    // Obtener usuario actual (método flexible)
    getCurrentUser(): User | null {
        // Intentar obtener del BehaviorSubject primero
        const currentUser = this.currentUserSubject.value;
        if (currentUser) return currentUser;

        // Si no está disponible, obtener del localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                // Si falla el parsing, usar el método anterior
                const email = localStorage.getItem('email');
                const rol = localStorage.getItem('rol');
                if (email && rol) {
                    return { email, rol };
                }
            }
        }

        return null;
    }

    // Verificar si está autenticado (ambos nombres para compatibilidad)
    isLoggedIn(): boolean {
        return this.getToken() !== null;
    }

    isAuthenticated(): boolean {
        return this.isLoggedIn();
    }

    // Obtener headers de autorización (método simple)
    getAuthHeaders() {
        const token = this.getToken();
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    }

    // Obtener headers HTTP completos
    private getHttpHeaders(): HttpHeaders {
        const token = this.getToken();
        
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        });
    }

    updateApiUrl(newUrl: string): void {
        this.apiUrl = newUrl;
    }

    forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.apiUrl}/forgot-password`, request);
    }

    resetPassword(request: ResetPasswordRequest): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.apiUrl}/reset-password`, request);
    }

    validateResetToken(token: string): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiUrl}/validate-reset-token?token=${token}`);
    }
}