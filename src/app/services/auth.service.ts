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

    // Guardar datos de autenticación - MÉTODO ACTUALIZADO (tu versión con logs)
    saveAuthData(response: LoginResponse): void {
        console.log('🔧 AUTH DEBUG: Guardando datos de autenticación:', response);
        
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
            console.log('✅ AUTH DEBUG: Usuario guardado en localStorage:', userObject);
            console.log('✅ AUTH DEBUG: Token guardado:', response.token ? 'Presente' : 'Ausente');

            // Actualizar BehaviorSubjects
            this.currentUserSubject.next(userObject);
            this.tokenSubject.next(response.token);
            
            // Verificar que se guardó correctamente
            const savedUser = localStorage.getItem('user');
            const savedToken = localStorage.getItem('token');
            console.log('🔍 AUTH DEBUG: Verificación - Usuario guardado:', savedUser);
            console.log('🔍 AUTH DEBUG: Verificación - Token guardado:', savedToken ? 'Presente' : 'Ausente');
        } else {
            console.error('❌ AUTH DEBUG: Datos de respuesta incompletos:', response);
        }
    }

    // Verificar autenticación almacenada - MÉTODO ACTUALIZADO (tu versión con logs)
    private checkStoredAuth(): void {
        console.log('🔧 AUTH DEBUG: Verificando autenticación almacenada...');
        
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        console.log('🔍 AUTH DEBUG: Token en localStorage:', token ? 'Presente' : 'Ausente');
        console.log('🔍 AUTH DEBUG: User en localStorage:', userStr);

        if (token) {
            this.tokenSubject.next(token);
            
            // Intentar obtener user completo primero
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    console.log('✅ AUTH DEBUG: Usuario parseado correctamente:', user);
                    this.currentUserSubject.next(user);
                    return;
                } catch (e) {
                    console.warn('⚠️ AUTH DEBUG: Error parsing stored user, usando fallback:', e);
                }
            }

            // Fallback a email y rol separados
            const email = localStorage.getItem('email');
            const rol = localStorage.getItem('rol');
            if (email && rol) {
                const fallbackUser = { email, rol };
                console.log('✅ AUTH DEBUG: Usando fallback user:', fallbackUser);
                
                // Guardar en formato correcto para futuras sesiones
                localStorage.setItem('user', JSON.stringify(fallbackUser));
                this.currentUserSubject.next(fallbackUser);
            } else {
                console.error('❌ AUTH DEBUG: No se pudo restaurar usuario de localStorage');
            }
        } else {
            console.log('ℹ️ AUTH DEBUG: No hay token almacenado');
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
        const token = this.getToken();
        console.log('🔍 AUTH DEBUG: Obteniendo perfil con token:', token ? 'Presente' : 'Ausente');
        
        const headers = this.getHttpHeaders();
        console.log('📋 AUTH DEBUG: Headers para profile:', headers);
        
        return this.http.get<UserProfileResponse>(`${this.apiUrl}/profile`, { headers })
            .pipe(
                tap(response => {
                    console.log('✅ AUTH DEBUG: Respuesta del perfil:', response);
                })
            );
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

    // Obtener headers HTTP completos - MEJORADO CON LOG (tu versión)
    private getHttpHeaders(): HttpHeaders {
        const token = this.getToken();
        console.log('🔐 AUTH DEBUG: Creando headers con token:', token ? `Bearer ${token.substring(0, 20)}...` : 'Sin token');
        
        if (!token) {
            console.warn('⚠️ AUTH DEBUG: No hay token disponible para los headers');
        }
        
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