import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

export interface AgendaEventoDTO {
    idEvento?: number;
    propietario?: string;
    createdAt?: Date;
    updatedAt?: Date;
    titulo: string;
    descripcion?: string;
    fechaEvento: Date | string;
    tipo: string;
    completado?: boolean;
}

export interface EstadisticasAgendaDTO {
    totalEventos: number;
    eventosPendientes: number;
    eventosCompletados: number;
    eventosHoy: number;
}

export interface ApiErrorResponse {
    error: string;
}

@Injectable({
    providedIn: 'root'
})
export class AgendaService {
    private apiUrl = `${environment.apiUrl}/agenda`;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    private getHttpHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        });
    }

    // Método auxiliar para convertir fechas del backend
    private convertirFechasEvento(evento: any): AgendaEventoDTO {
        const convertirFecha = (fecha: any): Date => {
            if (!fecha) return new Date();
            if (fecha instanceof Date) return fecha;
            if (typeof fecha === 'string') {
                const fechaConvertida = new Date(fecha);
                return isNaN(fechaConvertida.getTime()) ? new Date() : fechaConvertida;
            }
            return new Date();
        };

        return {
            ...evento,
            fechaEvento: convertirFecha(evento.fechaEvento),
            createdAt: evento.createdAt ? convertirFecha(evento.createdAt) : undefined,
            updatedAt: evento.updatedAt ? convertirFecha(evento.updatedAt) : undefined
        };
    }


    private prepararEventoParaBackend(evento: AgendaEventoDTO | Partial<AgendaEventoDTO>, esCreacion: boolean = false): any {
        const eventoBackend = { ...evento };
        
        console.log('🔧 Service - Evento antes de preparar:', evento);
        console.log('🔧 Service - Fecha original:', evento.fechaEvento);
        
        if (esCreacion) {
            delete eventoBackend.idEvento;
            delete eventoBackend.propietario;
            delete eventoBackend.createdAt;
            delete eventoBackend.updatedAt;
        }
        
        console.log('🔧 Service - Evento preparado para backend:', eventoBackend);
        
        return eventoBackend;
    }

    // Obtener todos los eventos con permisos
    getEventos(): Observable<AgendaEventoDTO[]> {
        return this.http.get<any[]>(`${this.apiUrl}/eventos`, {
            headers: this.getHttpHeaders()
        }).pipe(
            map(eventos => eventos.map(evento => this.convertirFechasEvento(evento)))
        );
    }

    // Obtener evento específico
    getEvento(id: number): Observable<AgendaEventoDTO> {
        return this.http.get<any>(`${this.apiUrl}/eventos/${id}`, {
            headers: this.getHttpHeaders()
        }).pipe(
            map(evento => this.convertirFechasEvento(evento))
        );
    }

    // Crear nuevo evento (solo ADMINISTRADORES)
    crearEvento(evento: AgendaEventoDTO): Observable<AgendaEventoDTO> {
        const eventoBackend = this.prepararEventoParaBackend(evento, true); // true para creación
        
        return this.http.post<any>(`${this.apiUrl}/eventos`, eventoBackend, {
            headers: this.getHttpHeaders()
        }).pipe(
            map(eventoCreado => this.convertirFechasEvento(eventoCreado))
        );
    }

    // Actualizar evento (solo ADMINISTRADORES propietarios)
    actualizarEvento(id: number, evento: Partial<AgendaEventoDTO>): Observable<AgendaEventoDTO> {
        if (!id || isNaN(id)) {
            throw new Error(`ID de evento inválido: ${id}`);
        }

        const eventoBackend = this.prepararEventoParaBackend(evento, false); // false para actualización
        
        return this.http.put<any>(`${this.apiUrl}/eventos/${id}`, eventoBackend, {
            headers: this.getHttpHeaders()
        }).pipe(
            map(eventoActualizado => this.convertirFechasEvento(eventoActualizado))
        );
    }

    // Marcar evento como completado
    completarEvento(id: number): Observable<AgendaEventoDTO> {
        // Validar que el ID sea válido
        if (!id || isNaN(id)) {
            throw new Error(`ID de evento inválido: ${id}`);
        }

        return this.http.patch<any>(`${this.apiUrl}/eventos/${id}/completar`, {}, {
            headers: this.getHttpHeaders()
        }).pipe(
            map(eventoCompletado => this.convertirFechasEvento(eventoCompletado))
        );
    }

    // Eliminar evento (solo ADMINISTRADORES propietarios)
    eliminarEvento(id: number): Observable<any> {
        // Validar que el ID sea válido
        if (!id || isNaN(id)) {
            throw new Error(`ID de evento inválido: ${id}`);
        }

        return this.http.delete(`${this.apiUrl}/eventos/${id}`, {
            headers: this.getHttpHeaders()
        });
    }

    // Obtener estadísticas de la agenda
    getEstadisticas(): Observable<EstadisticasAgendaDTO> {
        return this.http.get<EstadisticasAgendaDTO>(`${this.apiUrl}/estadisticas`, {
            headers: this.getHttpHeaders()
        });
    }

    // Obtener eventos pendientes
    getEventosPendientes(): Observable<AgendaEventoDTO[]> {
        return this.http.get<any[]>(`${this.apiUrl}/eventos/pendientes`, {
            headers: this.getHttpHeaders()
        }).pipe(
            map(eventos => eventos.map(evento => this.convertirFechasEvento(evento)))
        );
    }

    // Obtener eventos de hoy
    getEventosHoy(): Observable<AgendaEventoDTO[]> {
        return this.http.get<any[]>(`${this.apiUrl}/eventos/hoy`, {
            headers: this.getHttpHeaders()
        }).pipe(
            map(eventos => eventos.map(evento => this.convertirFechasEvento(evento)))
        );
    }

    // Obtener tipos de eventos disponibles
    getTiposEvento(): string[] {
        return ['RIEGO', 'FERTILIZACION', 'COSECHA', 'MANTENIMIENTO', 'REUNION', 'OTRO'];
    }

    // Verificar si el usuario actual es administrador
    esAdministrador(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.rol === 'ADMINISTRADOR';
    }
}