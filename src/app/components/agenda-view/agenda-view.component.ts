import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AgendaService, AgendaEventoDTO, EstadisticasAgendaDTO } from '../../services/agenda.service';
import { AuthService, User } from '../../services/auth.service';

interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: AgendaEventoDTO[];
}

@Component({
  selector: 'app-agenda-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agenda-view.component.html',
  styleUrls: ['./agenda-view.component.css']
})
export class AgendaViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Usuario y permisos
  currentUser: User | null = null;
  esAdministrador = false;

  // Vista actual
  vistaActual: 'calendario' | 'lista' = 'calendario';

  // Datos principales
  eventos: AgendaEventoDTO[] = [];
  estadisticas: EstadisticasAgendaDTO = {
    totalEventos: 0,
    eventosPendientes: 0,
    eventosCompletados: 0,
    eventosHoy: 0
  };

  // Estado de carga
  loading = false;
  error: string | null = null;

  // Calendario
  fechaActual = new Date();
  calendarioDias: CalendarDay[] = [];
  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Modal y formulario
  mostrarModal = false;
  modoEdicion = false;
  eventoEditando: AgendaEventoDTO | null = null;
  eventoForm: FormGroup;

  // Filtros
  filtroTipo = '';
  filtroCompletado = '';
  busqueda = '';

  // Tipos de evento
  tiposEvento = ['RIEGO', 'FERTILIZACION', 'COSECHA', 'MANTENIMIENTO', 'REUNION', 'OTRO'];

  // Eventos filtrados
  eventosFiltrados: AgendaEventoDTO[] = [];

  constructor(
    private agendaService: AgendaService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.eventoForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: [''],
      fechaEvento: ['', Validators.required],
      tipo: ['OTRO'],
      completado: [false]
    });
  }

  ngOnInit(): void {
    this.inicializarComponente();
    this.generarCalendario();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private inicializarComponente(): void {
    // Obtener usuario actual y verificar permisos
    this.currentUser = this.authService.getCurrentUser();
    this.esAdministrador = this.agendaService.esAdministrador();
  }

  private cargarDatos(): void {
    this.loading = true;
    this.error = null;

    // Cargar eventos
    this.agendaService.getEventos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (eventos) => {
          this.eventos = eventos;
          this.aplicarFiltros();
          this.generarCalendario();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando eventos:', error);
          this.error = 'Error al cargar los eventos';
          this.loading = false;
        }
      });

    // Cargar estadísticas
    this.agendaService.getEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.estadisticas = stats;
        },
        error: (error) => {
          console.error('Error cargando estadísticas:', error);
        }
      });
  }

  // ======================== CALENDARIO ========================
  generarCalendario(): void {
    const primerDia = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth(), 1);
    const ultimoDia = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() + 1, 0);
    const primerDiaSemana = primerDia.getDay();
    const diasMes = ultimoDia.getDate();

    this.calendarioDias = [];

    // Días del mes anterior
    const mesAnterior = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth(), 0);
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const dia = mesAnterior.getDate() - i;
      const fecha = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth(), dia);
      this.calendarioDias.push({
        day: dia,
        date: fecha,
        isCurrentMonth: false,
        isToday: this.esFechaHoy(fecha),
        events: this.getEventosPorFecha(fecha)
      });
    }

    // Días del mes actual
    for (let dia = 1; dia <= diasMes; dia++) {
      const fecha = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth(), dia);
      this.calendarioDias.push({
        day: dia,
        date: fecha,
        isCurrentMonth: true,
        isToday: this.esFechaHoy(fecha),
        events: this.getEventosPorFecha(fecha)
      });
    }

    // Completar con días del siguiente mes si es necesario
    const diasRestantes = 42 - this.calendarioDias.length;
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const fecha = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() + 1, dia);
      this.calendarioDias.push({
        day: dia,
        date: fecha,
        isCurrentMonth: false,
        isToday: this.esFechaHoy(fecha),
        events: this.getEventosPorFecha(fecha)
      });
    }
  }

  private esFechaHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  }

  private getEventosPorFecha(fecha: Date): AgendaEventoDTO[] {
    return this.eventosFiltrados.filter(evento => {
      const fechaEvento = new Date(evento.fechaEvento);
      return fechaEvento.toDateString() === fecha.toDateString();
    });
  }

  // ======================== NAVEGACIÓN CALENDARIO ========================
  mesAnterior(): void {
    this.fechaActual = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() - 1, 1);
    this.generarCalendario();
  }

  mesSiguiente(): void {
    this.fechaActual = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() + 1, 1);
    this.generarCalendario();
  }

  irAHoy(): void {
    this.fechaActual = new Date();
    this.generarCalendario();
  }

  // ======================== FILTROS ========================
  aplicarFiltros(): void {
    this.eventosFiltrados = this.eventos.filter(evento => {
      let cumpleFiltros = true;

      // Filtro por tipo
      if (this.filtroTipo && evento.tipo !== this.filtroTipo) {
        cumpleFiltros = false;
      }

      // Filtro por estado completado
      if (this.filtroCompletado !== '') {
        const completado = this.filtroCompletado === 'true';
        if (evento.completado !== completado) {
          cumpleFiltros = false;
        }
      }

      // Filtro por búsqueda
      if (this.busqueda) {
        const termino = this.busqueda.toLowerCase();
        const coincideTitulo = evento.titulo.toLowerCase().includes(termino);
        const coincideDescripcion = evento.descripcion?.toLowerCase().includes(termino) || false;
        if (!coincideTitulo && !coincideDescripcion) {
          cumpleFiltros = false;
        }
      }

      return cumpleFiltros;
    });

    if (this.vistaActual === 'calendario') {
      this.generarCalendario();
    }
  }

  limpiarFiltros(): void {
    this.filtroTipo = '';
    this.filtroCompletado = '';
    this.busqueda = '';
    this.aplicarFiltros();
  }

  // ======================== CRUD EVENTOS ========================
  abrirModalCrear(): void {
    if (!this.esAdministrador) {
      this.mostrarError('Solo los administradores pueden crear eventos');
      return;
    }

    this.modoEdicion = false;
    this.eventoEditando = null;
    this.eventoForm.reset({
      titulo: '',
      descripcion: '',
      fechaEvento: '',
      tipo: 'OTRO',
      completado: false
    });
    this.mostrarModal = true;
  }

  abrirModalEditar(evento: AgendaEventoDTO): void {
    if (!this.esAdministrador) {
      this.mostrarError('Solo los administradores pueden editar eventos');
      return;
    }

    this.modoEdicion = true;
    this.eventoEditando = evento;
    
    // ✅ NUEVO: Manejo mejorado de la fecha para edición
    let fechaISO: string;
    
    try {
        const fecha = evento.fechaEvento instanceof Date ? 
            evento.fechaEvento : 
            new Date(evento.fechaEvento);
            
        if (isNaN(fecha.getTime())) {
            throw new Error('Fecha inválida');
        }
        
        // ✅ CORREGIDO: Formato correcto para datetime-local
        // Obtener componentes de fecha en zona horaria local
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const hours = String(fecha.getHours()).padStart(2, '0');
        const minutes = String(fecha.getMinutes()).padStart(2, '0');
        
        fechaISO = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // 🔧 DEBUG
        console.log('🔧 Frontend - Fecha original del evento:', evento.fechaEvento);
        console.log('🔧 Frontend - Fecha convertida para input:', fechaISO);
        
    } catch (error) {
        console.error('Error convirtiendo fecha para edición:', error);
        const ahora = new Date();
        fechaISO = ahora.toISOString().slice(0, 16);
    }
    
    this.eventoForm.patchValue({
        titulo: evento.titulo,
        descripcion: evento.descripcion || '',
        fechaEvento: fechaISO,
        tipo: evento.tipo,
        completado: evento.completado || false
    });
    
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.modoEdicion = false;
    this.eventoEditando = null;
    this.eventoForm.reset();
  }

  private convertirFechasEvento(evento: any): AgendaEventoDTO {
    const convertirFecha = (fecha: any): Date => {
        if (!fecha) return new Date();
        if (fecha instanceof Date) return fecha;
        if (typeof fecha === 'string') {

            try {
                const fechaConvertida = new Date(fecha);
                if (isNaN(fechaConvertida.getTime())) {
                    console.warn('Fecha inválida recibida:', fecha);
                    return new Date();
                }
                return fechaConvertida;
            } catch (error) {
                console.error('Error convirtiendo fecha:', fecha, error);
                return new Date();
            }
        }
        return new Date();
    };

    const eventoConvertido = {
        ...evento,
        fechaEvento: convertirFecha(evento.fechaEvento),
        createdAt: evento.createdAt ? convertirFecha(evento.createdAt) : undefined,
        updatedAt: evento.updatedAt ? convertirFecha(evento.updatedAt) : undefined
    };

    console.log('🔧 Service - Evento original del backend:', evento);
    console.log('🔧 Service - Evento convertido:', eventoConvertido);
    
    return eventoConvertido;
  }

  guardarEvento(): void {
    if (!this.eventoForm.valid) {
      this.mostrarError('Por favor complete todos los campos requeridos');
      return;
    }

    const formValue = this.eventoForm.value;

    // ✅ NUEVO: Enviar la fecha exactamente como la ingresó el usuario
    // Sin conversiones ni manipulaciones adicionales
    const eventoData: AgendaEventoDTO = {
      titulo: formValue.titulo,
      descripcion: formValue.descripcion,
      fechaEvento: formValue.fechaEvento, // ✅ Directo del formulario
      tipo: formValue.tipo,
      completado: formValue.completado
    };

    // 🔧 DEBUG: Para verificar qué se está enviando
    console.log('🔧 Frontend - Datos del evento a enviar:', eventoData);
    console.log('🔧 Frontend - Fecha original del formulario:', formValue.fechaEvento);

    this.loading = true;

    if (this.modoEdicion && this.eventoEditando && this.eventoEditando.idEvento) {
      // Actualizar evento existente
      this.agendaService.actualizarEvento(this.eventoEditando.idEvento, eventoData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (eventoActualizado) => {
            console.log('🔧 Frontend - Evento actualizado recibido:', eventoActualizado);
            this.loading = false;
            this.cerrarModal();
            this.cargarDatos();
            this.mostrarExito('Evento actualizado correctamente');
          },
          error: (error) => {
            this.loading = false;
            console.error('Error actualizando evento:', error);
            this.mostrarError('Error al actualizar el evento: ' + (error.error?.error || error.message || 'Error desconocido'));
          }
        });
    } else {
      // Crear nuevo evento
      this.agendaService.crearEvento(eventoData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (eventoCreado) => {
            console.log('🔧 Frontend - Evento creado recibido:', eventoCreado);
            this.loading = false;
            this.cerrarModal();
            this.cargarDatos();
            this.mostrarExito('Evento creado correctamente');
          },
          error: (error) => {
            this.loading = false;
            console.error('Error creando evento:', error);
            this.mostrarError('Error al crear el evento: ' + (error.error?.error || error.message || 'Error desconocido'));
          }
        });
    }
  }

  eliminarEvento(evento: AgendaEventoDTO): void {
    if (!this.esAdministrador) {
      this.mostrarError('Solo los administradores pueden eliminar eventos');
      return;
    }

    if (!evento.idEvento) {
      this.mostrarError('Error: ID de evento no válido');
      console.error('ID de evento faltante:', evento);
      return;
    }

    if (!confirm(`¿Está seguro de que desea eliminar el evento "${evento.titulo}"?`)) {
      return;
    }

    this.loading = true;

    this.agendaService.eliminarEvento(evento.idEvento)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.cargarDatos();
          this.mostrarExito('Evento eliminado correctamente');
        },
        error: (error) => {
          this.loading = false;
          console.error('Error eliminando evento:', error);
          this.mostrarError('Error al eliminar el evento: ' + (error.error?.error || error.message || 'Error desconocido'));
        }
      });
  }

  toggleCompletado(evento: AgendaEventoDTO): void {
    if (!this.esAdministrador) {
      this.mostrarError('Solo los administradores pueden modificar eventos');
      return;
    }

    if (!evento.idEvento) {
      this.mostrarError('Error: ID de evento no válido');
      return;
    }

    this.agendaService.completarEvento(evento.idEvento)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarDatos();
          this.mostrarExito('Estado del evento actualizado');
        },
        error: (error) => {
          console.error('Error actualizando estado:', error);
          this.mostrarError('Error al actualizar el evento: ' + (error.error?.error || error.message || 'Error desconocido'));
        }
      });
  }

  // ======================== UTILIDADES ========================
  cambiarVista(vista: 'calendario' | 'lista'): void {
    this.vistaActual = vista;
    if (vista === 'calendario') {
      this.generarCalendario();
    }
  }

  formatearFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearTipo(tipo: string): string {
    const tipos: Record<string, string> = {
      'RIEGO': 'Riego',
      'FERTILIZACION': 'Fertilización',
      'COSECHA': 'Cosecha',
      'MANTENIMIENTO': 'Mantenimiento',
      'REUNION': 'Reunión',
      'OTRO': 'Otro'
    };
    return tipos[tipo] || tipo;
  }

  getColorTipo(tipo: string): string {
    const colores: Record<string, string> = {
      'RIEGO': '#3B82F6',
      'FERTILIZACION': '#10B981',
      'COSECHA': '#F59E0B',
      'MANTENIMIENTO': '#EF4444',
      'REUNION': '#8B5CF6',
      'OTRO': '#6B7280'
    };
    return colores[tipo] || '#6B7280';
  }

  private mostrarExito(mensaje: string): void {
    // Aquí podrías integrar un servicio de notificaciones
    console.log('Éxito:', mensaje);
  }

  private mostrarError(mensaje: string): void {
    console.error('Error:', mensaje);
    this.error = mensaje;
    // Limpiar error después de 5 segundos
    setTimeout(() => {
      this.error = null;
    }, 5000);
  }
}