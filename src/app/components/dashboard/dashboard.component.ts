import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AgendaViewComponent } from '../agenda-view/agenda-view.component';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { SensorDataService } from '../../services/sensor-data.service';
import { SensorData, Device, User } from '../../interfaces/sensor-data.interface';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import {
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController, 
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  LineController,
  Title, 
  Tooltip, 
  Legend, 
  TimeScale
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, AgendaViewComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  showDebugDetails: boolean = false; 
  showLogoutConfirm: boolean = false;
  
  // Nuevas propiedades para el manejo de datos históricos
  historicalDataPeriod: number = 24; // horas por defecto
  isLoadingHistoricalData: boolean = false;
  maxDataPoints: number = 1000; // límite para evitar problemas de rendimiento

  debugConnection(): void {
    const debugInfo = this.sensorService.getDebugInfo();
    console.log('Estado completo del sistema:', {
      component: {
        user: this.user,
        devices: this.devices,
        selectedDevice: this.selectedDevice,
        connected: this.connected,
        latestData: this.latestData,
        sensorDataLength: this.sensorData.length,
        historicalDataPeriod: this.historicalDataPeriod,
        subscriptions: this.subscriptions.length
      },
      service: debugInfo,
      localStorage: {
        token: localStorage.getItem('token') ? 'Presente' : 'Ausente',
        user: localStorage.getItem('user') ? 'Presente' : 'Ausente'
      },
      environment: {
      }
    });
    
    this.sensorService.checkSubscribers();
    
    alert('Información de debug enviada a la consola. Abre F12 para verla.');
  }

  forceReconnect(): void {
    console.log('Forzando reconexión desde componente...');
    this.sensorService.forceReconnect();
    
    setTimeout(() => {
        this.loadDevices();
    }, 3000);
  }

  // Método para probar WebSocket
  testWebSocket(): void {
    const user = this.user;
    if (!user) {
      console.error('No hay usuario para probar');
      alert('Error: No hay usuario logueado');
      return;
    }

    console.log('🔧 TEST: Información de conexión:');
    console.log('User email:', user.email);
    console.log('Topic esperado:', `/topic/sensor-data/${user.email}`);
    console.log('Connected:', this.connected);
    
    // Verificar que el dispositivo seleccionado existe
    if (this.selectedDevice) {
      console.log('Dispositivo seleccionado:', this.selectedDevice.deviceCode);
      console.log('Último dato recibido:', this.latestData?.timestamp);
    } else {
      console.log('No hay dispositivo seleccionado');
    }
    
    alert('Test completado. Ver consola para detalles.');
  }

  checkDataFlow(): void {
    console.log('🔍 DEBUG: Verificando flujo completo de datos...');
    
    const user = this.getCurrentUser();
    console.log('1. Usuario:', user);
    

    console.log('2. WebSocket conectado:', this.connected);

    console.log('3. Dispositivo seleccionado:', this.selectedDevice);
    
    console.log('4. Datos recientes (últimos 3):');
    this.sensorData.slice(-3).forEach((data, index) => {
      console.log(`   ${index + 1}. ${data.timestamp} - Device: ${data.deviceCode}`);
    });
    
    console.log('5. Número de suscripciones activas:', this.subscriptions.length);
    
    console.log('6. Debug del servicio:', this.sensorService.getDebugInfo());
  }

  private getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  user: User | null = null;
  devices: Device[] = [];
  selectedDevice: Device | null = null;
  sensorData: SensorData[] = [];
  latestData: SensorData | null = null;
  

  connected: boolean = false;
  loading: boolean = false;
  showLinkDevice: boolean = false;
  

  deviceCode: string = '';
  deviceName: string = '';
  

  temperatureChart: Chart | null = null;
  humidityChart: Chart | null = null;

  private subscriptions: Subscription[] = [];
  
  constructor(
    private sensorService: SensorDataService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('=== DEBUG DASHBOARD INIT ===');
    console.log('SensorService URL:', this.sensorService['apiUrl']);

    this.loadUser();
    
    this.waitForUserAndInitialize();
  }

  private waitForUserAndInitialize(): void {
    // Función que verifica si el usuario está disponible
    const checkUser = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
        
      console.log('🔍 DEBUG: Verificando usuario disponible...');
      console.log('- User en localStorage:', userStr);
      console.log('- Token en localStorage:', token ? 'Presente' : 'Ausente');
        
      if (userStr && token) {
        try {
          const user = JSON.parse(userStr);
          if (user && user.email) {
            console.log('✅ DEBUG: Usuario válido encontrado:', user);
            this.initializeServices();
            return true;
          }
        } catch (e) {
          console.error('❌ DEBUG: Error parseando usuario:', e);
        }
      }
      return false;
    };

    // Verificar inmediatamente
    if (checkUser()) return;

    // Si no está disponible, reintentar cada 500ms hasta 10 intentos
    let attempts = 0;
    const maxAttempts = 10;
    
    const interval = setInterval(() => {
      attempts++;
      console.log(`🔄 DEBUG: Intento ${attempts}/${maxAttempts} de encontrar usuario`);
        
      if (checkUser()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('❌ DEBUG: Máximo de intentos alcanzado. Usuario no disponible.');
      }
    }, 500);
  }

  private initializeServices(): void {
    console.log('🚀 DEBUG: Inicializando servicios...');
    
    this.sensorService.initializeIfNeeded();
    
    this.setupWebSocketSubscription();
    this.setupSensorDataSubscription();
    
    this.loadDevices();
    
    console.log('✅ DEBUG: Servicios inicializados correctamente');
  }

  debugUserStatus(): void {
    console.log('=== DEBUG USER STATUS ===');
    console.log('this.user:', this.user);
    console.log('localStorage user:', localStorage.getItem('user'));
    console.log('localStorage token:', localStorage.getItem('token') ? 'Presente' : 'Ausente');
    console.log('localStorage email:', localStorage.getItem('email'));
    console.log('AuthService currentUser:', this.getCurrentUser());
    console.log('WebSocket connected:', this.connected);
    console.log('Selected device:', this.selectedDevice?.deviceCode);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.sensorService.disconnect();
    
    if (this.temperatureChart) {
      this.temperatureChart.destroy();
    }
    if (this.humidityChart) {
      this.humidityChart.destroy();
    }
  }

  private loadUser(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = JSON.parse(userStr);
    }
  }

  private loadDevices(): void {
    this.loading = true;
    const sub = this.sensorService.getUserDevices().subscribe({
      next: (devices) => {
        this.devices = devices;
        if (devices.length > 0 && !this.selectedDevice) {
          this.selectDevice(devices[0]);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading devices:', error);
        this.loading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  private setupWebSocketSubscription(): void {
    const sub = this.sensorService.connected$.subscribe(connected => {
      this.connected = connected;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(sub);
  }

  private setupSensorDataSubscription(): void {
    console.log('🔧 DEBUG: Configurando suscripción a datos del sensor...');
    
    const sub = this.sensorService.sensorData$.subscribe(data => {
      console.log('📊 DEBUG: Datos en tiempo real recibidos:', data);
      
      if (data && this.selectedDevice && data.deviceCode === this.selectedDevice.deviceCode) {
        console.log('✅ DEBUG: Datos corresponden al dispositivo seleccionado');
        
        // Verificar si ya existe este dato (evitar duplicados)
        const existingDataIndex = this.sensorData.findIndex(
          existing => existing.timestamp === data.timestamp && existing.deviceCode === data.deviceCode
        );
        
        if (existingDataIndex === -1) {
          // Nuevo dato - agregarlo
          this.sensorData = [...this.sensorData, data];
          this.latestData = data;
          
          // Mantener solo los últimos N puntos para evitar problemas de rendimiento
          if (this.sensorData.length > this.maxDataPoints) {
            this.sensorData = this.sensorData.slice(-this.maxDataPoints);
          }
          
          console.log('📊 DEBUG: Nuevo dato agregado. Total:', this.sensorData.length);
          
          // Actualizar gráficos y UI
          this.updateCharts();
          this.cdr.detectChanges();
        } else {
          console.log('⚠️ DEBUG: Dato duplicado ignorado');
        }
      }
    });
    
    this.subscriptions.push(sub);
    console.log('✅ DEBUG: Suscripción configurada. Total suscripciones:', this.subscriptions.length);
  }

  selectDevice(device: Device): void {
    console.log('📱 DEBUG: Seleccionando dispositivo:', device.deviceCode);
    this.selectedDevice = device;
    this.loadHistoricalDataForDevice(device.deviceCode);
  }

  // MÉTODO PRINCIPAL MODIFICADO - Cargar datos históricos más extensos
  private loadHistoricalDataForDevice(deviceCode: string): void {
    console.log(`📊 DEBUG: Cargando datos históricos para ${deviceCode} (${this.historicalDataPeriod} horas)`);
    this.isLoadingHistoricalData = true;
    
    const sub = this.sensorService.getSensorData(deviceCode, this.historicalDataPeriod).subscribe({
      next: (data) => {
        console.log(`✅ DEBUG: Datos históricos cargados: ${data.length} registros`);
        
        // Ordenar por timestamp para asegurar orden cronológico
        this.sensorData = data.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Establecer el dato más reciente
        this.latestData = this.sensorData.length > 0 ? 
          this.sensorData[this.sensorData.length - 1] : null;
        
        console.log('📊 DEBUG: Datos ordenados:', {
          total: this.sensorData.length,
          primero: this.sensorData[0]?.timestamp,
          ultimo: this.latestData?.timestamp
        });
        
        this.updateCharts();
        this.isLoadingHistoricalData = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ DEBUG: Error cargando datos históricos:', error);
        this.isLoadingHistoricalData = false;
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(sub);
  }

  // NUEVO MÉTODO - Cambiar período de datos históricos
  changeHistoricalPeriod(hours: number): void {
    if (this.selectedDevice && hours !== this.historicalDataPeriod) {
      this.historicalDataPeriod = hours;
      console.log(`🔄 DEBUG: Cambiando período histórico a ${hours} horas`);
      this.loadHistoricalDataForDevice(this.selectedDevice.deviceCode);
    }
  }

  // NUEVO MÉTODO - Refrescar datos históricos manualmente
  refreshHistoricalData(): void {
    if (this.selectedDevice) {
      console.log('🔄 DEBUG: Refrescando datos históricos manualmente');
      this.loadHistoricalDataForDevice(this.selectedDevice.deviceCode);
    }
  }

  // MÉTODO MODIFICADO - Método obsoleto para compatibilidad (ya no se usa)
  private loadSensorDataForDevice(deviceCode: string): void {
    // Este método ahora redirige al nuevo método de datos históricos
    this.loadHistoricalDataForDevice(deviceCode);
  }

  private updateCharts(): void {
    if (this.sensorData.length === 0) return;

    setTimeout(() => {
      this.updateTemperatureChart();
      this.updateHumidityChart();
    }, 100);
  }

  private updateTemperatureChart(): void {
    const ctx = document.getElementById('temperatureChart') as HTMLCanvasElement;
    if (!ctx) {
      console.warn('Canvas element temperatureChart not found');
      return;
    }

    if (this.temperatureChart) {
      this.temperatureChart.destroy();
    }

    // Usar todos los datos disponibles para los gráficos
    const chartData = this.sensorData.slice(-200); // Últimos 200 puntos para mantener rendimiento

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        datasets: [{
          label: 'Temperatura Ambiente (°C)',
          data: chartData.map(d => ({
            x: new Date(d.timestamp).getTime(),
            y: d.temperaturaAmbiente || 0 
          })),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5
        }, {
          label: 'Temperatura Suelo (°C)',
          data: chartData.map(d => ({
            x: new Date(d.timestamp).getTime(),
            y: d.temperaturaSuelo || 0
          })),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'DD/MM'
              }
            },
            title: {
              display: true,
              text: 'Tiempo'
            }
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Temperatura (°C)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: `Temperatura (Últimas ${this.historicalDataPeriod}h)`
          }
        }
      }
    };

    try {
      this.temperatureChart = new Chart(ctx, config);
    } catch (error) {
      console.error('Error creating temperature chart:', error);
    }
  }

  private updateHumidityChart(): void {
    const ctx = document.getElementById('humidityChart') as HTMLCanvasElement;
    if (!ctx) {
      console.warn('Canvas element humidityChart not found');
      return;
    }

    if (this.humidityChart) {
      this.humidityChart.destroy();
    }

    // Usar todos los datos disponibles para los gráficos
    const chartData = this.sensorData.slice(-200); // Últimos 200 puntos para mantener rendimiento

    const config: ChartConfiguration<'line'> = { 
      type: 'line',
      data: {
        datasets: [{
          label: 'Humedad Ambiente (%)',
          data: chartData.map(d => ({
            x: new Date(d.timestamp).getTime(),
            y: d.humedadAmbiente || 0
          })),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5
        }, {
          label: 'Humedad Suelo (%)',
          data: chartData.map(d => ({
            x: new Date(d.timestamp).getTime(),
            y: d.humedadSuelo || 0
          })),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'DD/MM'
              }
            },
            title: {
              display: true,
              text: 'Tiempo'
            }
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Humedad (%)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: `Humedad (Últimas ${this.historicalDataPeriod}h)`
          }
        }
      }
    };

    try {
      this.humidityChart = new Chart(ctx, config);
    } catch (error) {
      console.error('Error creating humidity chart:', error);
    }
  }

  // Device linking methods
  openLinkDeviceModal(): void {
    this.showLinkDevice = true;
    this.deviceCode = '';
    this.deviceName = '';
  }

  closeLinkDeviceModal(): void {
    this.showLinkDevice = false;
    this.deviceCode = '';
    this.deviceName = '';
  }

  linkDevice(): void {
    if (!this.deviceCode.trim() || !this.deviceName.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Obtener el usuario actual
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.email) {
      alert('Error: Usuario no válido');
      return;
    }

    // Estructura del request más completa
    const request = {
      deviceCode: this.deviceCode.toUpperCase().trim(),
      deviceName: this.deviceName.trim(),
      userEmail: currentUser.email, // Agregar email del usuario
      // Agrega otros campos si tu backend los requiere
    };

    console.log('Enviando request para vincular dispositivo:', request);

    const sub = this.sensorService.linkDevice(request).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        if (response && response.success) {
          alert('¡Dispositivo vinculado exitosamente!');
          this.loadDevices();
          this.closeLinkDeviceModal();
        } else {
          alert('Respuesta inesperada del servidor');
          console.error('Respuesta sin success:', response);
        }
      },
      error: (error) => {
        console.error('Error completo linking device:', error);
        console.error('Status:', error.status);
        console.error('Error body:', error.error);
        
        // Mensajes de error más específicos
        if (error.status === 400) {
          const errorMsg = error.error?.message || error.error?.error || 'Datos inválidos';
          alert('Error de validación: ' + errorMsg);
        } else if (error.status === 401) {
          alert('Error de autenticación. Inicia sesión nuevamente.');
        } else if (error.status === 409) {
          alert('El dispositivo ya está vinculado a otro usuario');
        } else {
          alert('Error al vincular dispositivo: ' + (error.error?.message || 'Error desconocido'));
        }
      }
    });
    this.subscriptions.push(sub);
  }

  // Método adicional para debug del request
  debugLinkDevice(): void {
    const currentUser = this.getCurrentUser();
    console.log('DEBUG Link Device:');
    console.log('- Usuario actual:', currentUser);
    console.log('- Device Code:', this.deviceCode);
    console.log('- Device Name:', this.deviceName);
    console.log('- Token:', localStorage.getItem('token') ? 'Presente' : 'Ausente');
    
    // Ver qué headers se están enviando
    const headers = this.sensorService['getAuthHeaders']();
    console.log('- Headers que se enviarán:', headers);
  }

  // Utility methods
  getDeviceStatus(device: Device): { status: string; color: string; bg: string } {
    if (!device.lastSeen) {
      return { status: 'Sin datos', color: 'text-gray-600', bg: 'bg-gray-100' };
    }

    const timeDiff = Date.now() - new Date(device.lastSeen).getTime();
    const minutesAgo = Math.floor(timeDiff / 60000);

    if (minutesAgo < 5) return { status: 'Online', color: 'text-green-600', bg: 'bg-green-100' };
    if (minutesAgo < 15) return { status: 'Reciente', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'Offline', color: 'text-red-600', bg: 'bg-red-100' };
  }

  getBatteryColor(level: number): string {
    if (level > 60) return 'text-green-600';
    if (level > 30) return 'text-yellow-600';
    return 'text-red-600';
  }

  getHumedadSueloStatus(humedad: number): { status: string; color: string; bg: string } {
    if (humedad <= 10) return { status: 'MUY SECO', color: 'text-red-600', bg: 'bg-red-100' };
    if (humedad <= 25) return { status: 'IDEAL', color: 'text-green-600', bg: 'bg-green-100' };
    if (humedad <= 50) return { status: 'HÚMEDO', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (humedad <= 75) return { status: 'MUY HÚMEDO', color: 'text-indigo-600', bg: 'bg-indigo-100' };
    return { status: 'ENCHARCADO', color: 'text-purple-600', bg: 'bg-purple-100' };
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString('es-ES');
  }

  formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
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
        this.sensorService.disconnect();
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error en logout:', error);
        this.authService.clearAuthData();
        this.sensorService.disconnect();
        this.router.navigate(['/login']);
      }
    });
  }
}