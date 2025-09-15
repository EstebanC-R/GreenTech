import { Component, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface CultivoDTO {
  idCultivo?: number;
  deviceIdFk?: number;
  usuarioResponsable?: string;
  nombreCultivo: string;
  tipoDeCultivo: string;
  fechaRegistro?: string;
  fechaPlantacion?: string;
  produccionEstimada?: number;
  humedadSueloMin?: number;
  humedadSueloMax?: number;
  temperaturaMin?: number;
  temperaturaMax?: number;
  estadoCultivo?: string;
  descripcion?: string;
  deviceCode?: string;
  deviceName?: string;
}

interface Device {
  id: number;
  deviceCode: string;
  deviceName: string;
}

interface TipoCultivoInfo {
  nombre: string;
  rendimientoPorHectarea: number; // kg por hectárea
  semillasPorHectarea?: number;
  cicloVida: number; // días
  descripcion: string;
}

@Component({
  selector: 'app-cultivos',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './cultivos.component.html',
  styleUrls: ['./cultivos.component.css']
})
export class CultivosComponent implements AfterViewInit, OnInit {
  @ViewChild('videoFondo') videoElement!: ElementRef<HTMLVideoElement>;

  // Datos y estados
  cultivos: CultivoDTO[] = [];
  devices: Device[] = [];
  loading = false;
  error = '';
  success = '';

  // Modal states
  showModal = false;
  showDeleteModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedCultivo: CultivoDTO | null = null;
  cultivoToDelete: CultivoDTO | null = null;

  // Form data básico
  cultivoForm: CultivoDTO = {
    nombreCultivo: '',
    tipoDeCultivo: '',
    fechaPlantacion: '',
    produccionEstimada: 0,
    humedadSueloMin: 0,
    humedadSueloMax: 0,
    temperaturaMin: 0,
    temperaturaMax: 0,
    estadoCultivo: 'EN_PROGRESO',
    descripcion: ''
  };

  // Form extendido con cálculos
  cultivoFormExtendido = {
    ...this.cultivoForm,
    hectareas: 1,
    numeroSemillas: 0,
    calculoAutomatico: true,
    factorAjuste: 1.0
  };

  // Permisos del usuario
  userRole = '';
  isAdmin = false;

  // Información detallada de cultivos
  tipoCultivoPersonalizado: string = '';
  tiposCultivoInfo: TipoCultivoInfo[] = [
    {
      nombre: 'Tomate',
      rendimientoPorHectarea: 60000, // 60 toneladas promedio
      semillasPorHectarea: 25000,
      cicloVida: 120,
      descripcion: 'Hortaliza de alto rendimiento'
    },
    {
      nombre: 'Maíz',
      rendimientoPorHectarea: 8000,
      semillasPorHectarea: 70000,
      cicloVida: 150,
      descripcion: 'Cereal básico'
    },
    {
      nombre: 'Frijol',
      rendimientoPorHectarea: 2500,
      semillasPorHectarea: 150000,
      cicloVida: 90,
      descripcion: 'Leguminosa rica en proteínas'
    },
    {
      nombre: 'Lechuga',
      rendimientoPorHectarea: 35000,
      semillasPorHectarea: 200000,
      cicloVida: 65,
      descripcion: 'Hortaliza de hoja verde'
    },
    {
      nombre: 'Zanahoria',
      rendimientoPorHectarea: 45000,
      semillasPorHectarea: 1000000,
      cicloVida: 100,
      descripcion: 'Hortaliza de raíz'
    },
    {
      nombre: 'Café',
      rendimientoPorHectarea: 1800,
      semillasPorHectarea: 5000,
      cicloVida: 1825, // 5 años para primera cosecha
      descripcion: 'Cultivo perenne de exportación'
    },
    {
      nombre: 'Aguacate',
      rendimientoPorHectarea: 12000,
      semillasPorHectarea: 156,
      cicloVida: 1460, // 4 años
      descripcion: 'Fruto tropical de alto valor'
    },
    {
      nombre: 'Cebolla',
      rendimientoPorHectarea: 40000,
      semillasPorHectarea: 800000,
      cicloVida: 140,
      descripcion: 'Hortaliza de bulbo'
    },
    {
      nombre: 'Papa',
      rendimientoPorHectarea: 25000,
      semillasPorHectarea: 40000,
      cicloVida: 120,
      descripcion: 'Tubérculo básico en alimentación'
    },
    {
      nombre: 'Arroz',
      rendimientoPorHectarea: 6000,
      semillasPorHectarea: 180000,
      cicloVida: 130,
      descripcion: 'Cereal de zonas húmedas'
    }
  ];

  

  // Opciones para selects
  estadosCultivo = ['EN_PROGRESO', 'COSECHADO', 'TERMINADO'];

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.playbackRate = 20.0;
    }
  }

  ngOnInit() {
    this.loadUserRole();
    this.loadCultivos();
    this.loadDevices();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('🔐 Enviando token en headers:', token ? 'Presente' : 'Ausente');
    
    if (!token) {
      console.error('❌ No hay token disponible para los headers');
    }
    
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private loadUserRole() {
    const token = localStorage.getItem('token');
    console.log('🔍 Token encontrado:', token ? 'Presente' : 'Ausente');
    
    if (token) {
      try {
        const tokenParts = token.split('.');
        console.log('📋 Partes del token:', tokenParts.length);
        
        if (tokenParts.length !== 3) {
          console.error('❌ Token inválido: no tiene 3 partes');
          return;
        }

        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('📄 Payload del token:', payload);
        
        this.userRole = payload.rol || '';
        this.isAdmin = this.userRole === 'ADMINISTRADOR';
        
        console.log('👤 Rol del usuario:', this.userRole);
        console.log('👑 Es admin:', this.isAdmin);
        
      } catch (error) {
        console.error('❌ Error al decodificar token:', error);
        localStorage.removeItem('token');
      }
    } else {
      console.warn('⚠️ No se encontró token en localStorage');
    }
  }

  loadCultivos() {
    this.loading = true;
    this.error = '';

    this.http.get<CultivoDTO[]>(`${environment.apiUrl}/cultivos`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.cultivos = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar cultivos:', error);
        this.error = 'Error al cargar los cultivos';
        this.loading = false;
      }
    });
  }

  loadDevices() {
    // Cambiado de /devices a /user/devices para coincidir con el backend
    this.http.get<Device[]>(`${environment.apiUrl}/user/devices`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.devices = data;
        console.log('📱 Dispositivos cargados:', data.length);
      },
      error: (error) => {
        console.error('Error al cargar dispositivos:', error);
        this.devices = [];
      }
    });
  }

  // Métodos de cálculo de producción
  getTipoCultivoInfo(nombre: string): TipoCultivoInfo | undefined {
    return this.tiposCultivoInfo.find(tipo => tipo.nombre === nombre);
  }

  calcularProduccionEstimada(): void {
    if (!this.cultivoFormExtendido.calculoAutomatico) {
      return;
    }

    // Si es "Otro", no calcular y mostrar mensaje
    if (this.cultivoFormExtendido.tipoDeCultivo === 'Otro') {
      this.cultivoFormExtendido.produccionEstimada = 0;
      this.cultivoForm.produccionEstimada = 0;
      this.error = 'No se puede calcular automáticamente la producción estimada para cultivos personalizados. Ingrese el valor manualmente si lo conoce.';
      return;
    }

    const tipoInfo = this.getTipoCultivoInfo(this.cultivoFormExtendido.tipoDeCultivo);

    if (!tipoInfo || !this.cultivoFormExtendido.hectareas) {
      this.cultivoFormExtendido.produccionEstimada = 0;
      this.cultivoForm.produccionEstimada = 0;
      return;
    }

    // Cálculo básico: rendimiento por hectárea × hectáreas × factor de ajuste
    const produccionBase = tipoInfo.rendimientoPorHectarea * 
                          this.cultivoFormExtendido.hectareas * 
                          this.cultivoFormExtendido.factorAjuste;

    // Si se especifica número de semillas, calcular basado en densidad real
    if (this.cultivoFormExtendido.numeroSemillas > 0 && tipoInfo.semillasPorHectarea) {
      const hectareasReales = this.cultivoFormExtendido.numeroSemillas / tipoInfo.semillasPorHectarea;
      this.cultivoFormExtendido.produccionEstimada = Math.round(
        tipoInfo.rendimientoPorHectarea * hectareasReales * this.cultivoFormExtendido.factorAjuste
      );
    } else {
      this.cultivoFormExtendido.produccionEstimada = Math.round(produccionBase);
    }

    // Actualizar el form principal
    this.cultivoForm.produccionEstimada = this.cultivoFormExtendido.produccionEstimada;
    this.error = '';
  }

  onTipoCultivoChange(): void {
    // Actualizar el form principal
    this.cultivoForm.tipoDeCultivo = this.cultivoFormExtendido.tipoDeCultivo;

    // Si selecciona "Otro", limpiar campos automáticos y pedir nombre personalizado
    if (this.cultivoFormExtendido.tipoDeCultivo === 'Otro') {
      this.tipoCultivoPersonalizado = '';
      this.cultivoFormExtendido.numeroSemillas = 0;
      this.cultivoFormExtendido.produccionEstimada = 0;
      this.cultivoForm.produccionEstimada = 0;
      return;
    }

    const tipoInfo = this.getTipoCultivoInfo(this.cultivoFormExtendido.tipoDeCultivo);

    if (tipoInfo && this.cultivoFormExtendido.calculoAutomatico) {
      if (tipoInfo.semillasPorHectarea) {
        this.cultivoFormExtendido.numeroSemillas = Math.round(
          tipoInfo.semillasPorHectarea * this.cultivoFormExtendido.hectareas
        );
      }
      this.calcularProduccionEstimada();
    }
  }

  toggleCalculoAutomatico(): void {
    if (this.cultivoFormExtendido.calculoAutomatico) {
      this.calcularProduccionEstimada();
    }
  }


  getCultivoDescription(): string {
    const tipoInfo = this.getTipoCultivoInfo(this.cultivoFormExtendido.tipoDeCultivo);
    if (!tipoInfo) return '';
    
    return `${tipoInfo.descripcion} - Rendimiento promedio: ${(tipoInfo.rendimientoPorHectarea/1000).toFixed(1)} ton/ha - Ciclo: ${tipoInfo.cicloVida} días`;
  }


  get tiposCultivo(): string[] {
    return [...this.tiposCultivoInfo.map(tipo => tipo.nombre), 'Otro'];
  }

  // Modal methods
  openCreateModal() {
    if (!this.isAdmin) {
      this.showError('Solo los administradores pueden crear cultivos');
      return;
    }
    
    this.modalMode = 'create';
    this.cultivoForm = {
      nombreCultivo: '',
      tipoDeCultivo: this.tiposCultivoInfo[0].nombre,
      fechaPlantacion: '',
      produccionEstimada: 0,
      humedadSueloMin: 0,
      humedadSueloMax: 0,
      temperaturaMin: 0,
      temperaturaMax: 0,
      estadoCultivo: 'EN_PROGRESO',
      descripcion: ''
    };

    this.cultivoFormExtendido = {
      ...this.cultivoForm,
      hectareas: 1,
      numeroSemillas: 0,
      calculoAutomatico: true,
      factorAjuste: 1.0
    };

    this.showModal = true;
    
    // Calcular producción inicial
    setTimeout(() => this.onTipoCultivoChange(), 100);
  }

  openEditModal(cultivo: CultivoDTO) {
    if (!this.isAdmin) {
      this.showError('Solo los administradores pueden editar cultivos');
      return;
    }

    this.modalMode = 'edit';
    this.selectedCultivo = cultivo;
    this.cultivoForm = { ...cultivo };
    
    // Formatear fecha para input date
    if (this.cultivoForm.fechaPlantacion) {
      this.cultivoForm.fechaPlantacion = this.cultivoForm.fechaPlantacion.split('T')[0];
    }

    // Inicializar campos extendidos (en modo edición, mantener valor manual)
    this.cultivoFormExtendido = {
      ...this.cultivoForm,
      hectareas: 1, 
      numeroSemillas: 0,
      calculoAutomatico: false, 
      factorAjuste: 1.0
    };
    
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedCultivo = null;
    this.error = '';
    this.success = '';
  }

  openDeleteModal(cultivo: CultivoDTO) {
    if (!this.isAdmin) {
      this.showError('Solo los administradores pueden eliminar cultivos');
      return;
    }

    this.cultivoToDelete = cultivo;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.cultivoToDelete = null;
  }

  // CRUD operations
  saveCultivo() {
    if (!this.isAdmin) {
      this.showError('Solo los administradores pueden guardar cultivos');
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';


    if (this.cultivoForm.tipoDeCultivo === 'Otro') {
      if (!this.tipoCultivoPersonalizado.trim()) {
        this.error = 'Debe ingresar el nombre del tipo de cultivo';
        return;
      }
      this.cultivoForm.tipoDeCultivo = this.tipoCultivoPersonalizado.trim();
    }

    if (!this.validateForm()) {
      return;
    }

    const request = this.modalMode === 'create' 
      ? this.http.post<CultivoDTO>(`${environment.apiUrl}/cultivos`, this.cultivoForm, { headers: this.getAuthHeaders() })
      : this.http.put<CultivoDTO>(`${environment.apiUrl}/cultivos/${this.selectedCultivo?.idCultivo}`, this.cultivoForm, { headers: this.getAuthHeaders() });

    request.subscribe({
      next: (response) => {
        this.success = `Cultivo ${this.modalMode === 'create' ? 'creado' : 'actualizado'} exitosamente`;
        this.loadCultivos();
        this.closeModal();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (error) => {
        console.error('Error al guardar cultivo:', error);
        this.error = error.error?.error || 'Error al guardar el cultivo';
        this.loading = false;
      }
    });
  }

  deleteCultivo() {
    if (!this.isAdmin || !this.cultivoToDelete) {
      this.showError('Solo los administradores pueden eliminar cultivos');
      return;
    }

    this.loading = true;

    this.http.delete(`${environment.apiUrl}/cultivos/${this.cultivoToDelete.idCultivo}`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => {
        this.success = 'Cultivo eliminado exitosamente';
        this.loadCultivos();
        this.closeDeleteModal();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (error) => {
        console.error('Error al eliminar cultivo:', error);
        this.error = error.error?.error || 'Error al eliminar el cultivo';
        this.loading = false;
      }
    });
  }

  // Validation
  validateForm(): boolean {
    if (!this.cultivoForm.nombreCultivo.trim()) {
      this.error = 'El nombre del cultivo es requerido';
      return false;
    }
    if (!this.cultivoForm.tipoDeCultivo) {
      this.error = 'El tipo de cultivo es requerido';
      return false;
    }
    if (this.cultivoForm.humedadSueloMin && this.cultivoForm.humedadSueloMax && 
        this.cultivoForm.humedadSueloMin >= this.cultivoForm.humedadSueloMax) {
      this.error = 'La humedad mínima debe ser menor que la máxima';
      return false;
    }
    if (this.cultivoForm.temperaturaMin && this.cultivoForm.temperaturaMax && 
        this.cultivoForm.temperaturaMin >= this.cultivoForm.temperaturaMax) {
      this.error = 'La temperatura mínima debe ser menor que la máxima';
      return false;
    }
    if (this.cultivoFormExtendido.calculoAutomatico && this.cultivoFormExtendido.hectareas <= 0) {
      this.error = 'Las hectáreas deben ser mayor a 0 para el cálculo automático';
      return false;
    }
    return true;
  }

  // Helper methods
  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'EN_PROGRESO': return 'estado-progreso';
      case 'COSECHADO': return 'estado-cosechado';
      case 'TERMINADO': return 'estado-terminado';
      default: return '';
    }
  }

  getEstadoText(estado: string): string {
    switch (estado) {
      case 'EN_PROGRESO': return 'En Progreso';
      case 'COSECHADO': return 'Cosechado';
      case 'TERMINADO': return 'Terminado';
      default: return estado;
    }
  }

  formatDate(date: string): string {
    if (!date) return 'No especificada';
    return new Date(date).toLocaleDateString('es-ES');
  }

  private showError(message: string) {
    this.error = message;
    setTimeout(() => this.error = '', 3000);
  }
}