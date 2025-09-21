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
  showLogoutConfirm: boolean = false;
  
  historicalDataPeriod: number = 24;
  isLoadingHistoricalData: boolean = false;
  maxDataPoints: number = 1000;

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
    this.loadUser();
    this.waitForUserAndInitialize();
  }

  private waitForUserAndInitialize(): void {
    const checkUser = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
        
      if (userStr && token) {
        try {
          const user = JSON.parse(userStr);
          if (user && user.email) {
            this.initializeServices();
            return true;
          }
        } catch (e) {
          console.error('Error parseando usuario:', e);
        }
      }
      return false;
    };

    if (checkUser()) return;

    let attempts = 0;
    const maxAttempts = 10;
    
    const interval = setInterval(() => {
      attempts++;
        
      if (checkUser()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
  }

  private initializeServices(): void {
    this.sensorService.initializeIfNeeded();
    this.setupWebSocketSubscription();
    this.setupSensorDataSubscription();
    this.loadDevices();
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
    const sub = this.sensorService.sensorData$.subscribe(data => {
      if (data && this.selectedDevice && data.deviceCode === this.selectedDevice.deviceCode) {
        const existingDataIndex = this.sensorData.findIndex(
          existing => existing.timestamp === data.timestamp && existing.deviceCode === data.deviceCode
        );
        
        if (existingDataIndex === -1) {
          this.sensorData = [...this.sensorData, data];
          this.latestData = data;
          
          if (this.sensorData.length > this.maxDataPoints) {
            this.sensorData = this.sensorData.slice(-this.maxDataPoints);
          }
          
          this.updateCharts();
          this.cdr.detectChanges();
        }
      }
    });
    
    this.subscriptions.push(sub);
  }

  selectDevice(device: Device): void {
    this.selectedDevice = device;
    this.loadHistoricalDataForDevice(device.deviceCode);
  }

  private loadHistoricalDataForDevice(deviceCode: string): void {
    this.isLoadingHistoricalData = true;
    
    const sub = this.sensorService.getSensorData(deviceCode, this.historicalDataPeriod).subscribe({
      next: (data) => {
        this.sensorData = data.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        this.latestData = this.sensorData.length > 0 ? 
          this.sensorData[this.sensorData.length - 1] : null;
        
        this.updateCharts();
        this.isLoadingHistoricalData = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando datos históricos:', error);
        this.isLoadingHistoricalData = false;
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(sub);
  }

  changeHistoricalPeriod(hours: number): void {
    if (this.selectedDevice && hours !== this.historicalDataPeriod) {
      this.historicalDataPeriod = hours;
      this.loadHistoricalDataForDevice(this.selectedDevice.deviceCode);
    }
  }

  refreshHistoricalData(): void {
    if (this.selectedDevice) {
      this.loadHistoricalDataForDevice(this.selectedDevice.deviceCode);
    }
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

    const chartData = this.sensorData.slice(-200);

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

    const chartData = this.sensorData.slice(-200);

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

    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.email) {
      alert('Error: Usuario no válido');
      return;
    }

    const request = {
      deviceCode: this.deviceCode.toUpperCase().trim(),
      deviceName: this.deviceName.trim(),
      userEmail: currentUser.email,
    };

    const sub = this.sensorService.linkDevice(request).subscribe({
      next: (response) => {
        if (response && response.success) {
          alert('¡Dispositivo vinculado exitosamente!');
          this.loadDevices();
          this.closeLinkDeviceModal();
        } else {
          alert('Respuesta inesperada del servidor');
        }
      },
      error: (error) => {
        console.error('Error linking device:', error);
        
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

  private getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

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