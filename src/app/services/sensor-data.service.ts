import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { SensorData, Device, LinkDeviceRequest } from '../interfaces/sensor-data.interface';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

@Injectable({
    providedIn: 'root'
})
export class SensorDataService {
    private apiUrl = environment.apiUrl;
    private stompClient!: Client;
    private connectedSubject = new BehaviorSubject<boolean>(false);
    private sensorDataSubject = new BehaviorSubject<SensorData | null>(null);
    private initialized = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    public connected$ = this.connectedSubject.asObservable();
    public sensorData$ = this.sensorDataSubject.asObservable();

    constructor(private http: HttpClient) {
    }

    public initializeIfNeeded(): void {
        if (this.initialized) {
            return;
        }

        const user = this.getCurrentUser();
        const token = localStorage.getItem('token');
        
        if (user && user.email && token) {
            this.initializeWebSocket();
            this.initialized = true;
        }
    }

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }

    private initializeWebSocket(): void {
        const user = this.getCurrentUser();
        const token = localStorage.getItem('token');
        
        if (!user || !user.email || !token) {
            return;
        }

        const wsUrl = `${this.apiUrl.replace('/api', '')}/ws`;

        // Si ya existe un cliente, desconectarlo primero
        if (this.stompClient) {
            this.stompClient.deactivate();
        }

        this.stompClient = new Client({
            webSocketFactory: () => {
                const socket = new SockJS(wsUrl);
                
                socket.onclose = (event) => {
                    // Reintentar si no es un cierre intencional
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };
                
                return socket;
            },
            connectHeaders: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            connectionTimeout: 30000,
        });

        this.stompClient.onConnect = (frame) => {
            this.connectedSubject.next(true);
            this.reconnectAttempts = 0;
            
            const topic = `/topic/sensor-data/${user.email}`;
            
            try {
                const subscription = this.stompClient.subscribe(topic, (message) => {
                    try {
                        const rawData = JSON.parse(message.body);
                        
                        const sensorData: SensorData = {
                            id: rawData.id,
                            deviceCode: rawData.device?.deviceCode || '',
                            deviceName: rawData.device?.deviceName || '',
                            temperaturaAmbiente: rawData.temperaturaAmbiente,
                            humedadAmbiente: rawData.humedadAmbiente,
                            temperaturaSuelo: rawData.temperaturaSuelo,
                            humedadSuelo: rawData.humedadSuelo,
                            batteryLevel: rawData.batteryLevel,
                            timestamp: rawData.timestamp
                        };
                        
                        this.sensorDataSubject.next(sensorData);
                        
                    } catch (parseError) {
                        console.error('Error parseando mensaje WebSocket:', parseError);
                    }
                }, {
                    'Authorization': `Bearer ${token}`
                });
                
                // Enviar mensaje de ping para mantener viva la conexión
                setTimeout(() => {
                    if (this.stompClient.connected) {
                        this.sendKeepAlive();
                    }
                }, 5000);
                
            } catch (subscribeError) {
                console.error('Error al suscribirse:', subscribeError);
            }
        };

        this.stompClient.onDisconnect = (frame) => {
            this.connectedSubject.next(false);
            
            // Solo reintentar si no fue una desconexión intencional
            if (frame && frame.headers && frame.headers['receipt-id'] !== 'close-1') {
                this.scheduleReconnect();
            }
        };

        this.stompClient.onStompError = (frame) => {
            this.connectedSubject.next(false);
        };

        this.stompClient.onWebSocketClose = (event) => {
            // Analizar el código de cierre
            switch (event.code) {
                case 1001:
                    this.scheduleReconnect();
                    break;
                case 1006:
                    this.scheduleReconnect();
                    break;
                default:
                    if (event.code !== 1000) {
                        this.scheduleReconnect();
                    }
            }
        };

        this.stompClient.activate();
    }

    private sendKeepAlive(): void {
        if (this.stompClient && this.stompClient.connected) {
            try {
                this.stompClient.publish({
                    destination: '/app/keep-alive',
                    body: JSON.stringify({ timestamp: new Date().toISOString() })
                });
                
                // Programar el siguiente keep-alive
                setTimeout(() => this.sendKeepAlive(), 30000);
            } catch (error) {
                console.error('Error enviando keep-alive:', error);
            }
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        setTimeout(() => {
            this.initialized = false;
            this.initializeIfNeeded();
        }, delay);
    }

    getUserDevices(): Observable<Device[]> {
        return this.http.get<Device[]>(`${this.apiUrl}/user/devices`, {
            headers: this.getAuthHeaders()
        });
    }

    linkDevice(request: LinkDeviceRequest): Observable<any> {
        return this.http.post(`${this.apiUrl}/link-device`, request, {
            headers: this.getAuthHeaders()
        });
    }

    getSensorData(deviceCode?: string, hours: number = 24): Observable<SensorData[]> {
        let url = `${this.apiUrl}/user/sensor-data?hours=${hours}`;
        if (deviceCode) {
            url += `&deviceCode=${deviceCode}`;
        }
        return this.http.get<SensorData[]>(url, {
            headers: this.getAuthHeaders()
        });
    }

    getLatestSensorData(deviceCode: string): Observable<SensorData> {
        return this.http.get<SensorData>(`${this.apiUrl}/sensor-data/latest/${deviceCode}`, {
            headers: this.getAuthHeaders()
        });
    }

    private getCurrentUser() {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        return user;
    }

    disconnect(): void {
        this.reconnectAttempts = this.maxReconnectAttempts;
        
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.deactivate();
        }
        this.connectedSubject.next(false);
        this.initialized = false;
    }

    getDebugInfo(): any {
        const user = this.getCurrentUser();
        return {
            apiUrl: this.apiUrl,
            wsUrl: this.apiUrl.replace('/api', '') + '/ws',
            wsConnected: this.connectedSubject.value,
            initialized: this.initialized,
            reconnectAttempts: this.reconnectAttempts,
            user: user,
            userEmail: user?.email,
            topic: `/topic/sensor-data/${user?.email}`,
            stompClientState: this.stompClient ? {
                connected: this.stompClient.connected,
                active: this.stompClient.active,
                state: this.stompClient.state
            } : 'No inicializado',
            token: localStorage.getItem('token') ? 'Presente' : 'Ausente'
        };
    }

    forceReconnect(): void {
        this.reconnectAttempts = 0;
        this.disconnect();
        setTimeout(() => {
            this.initializeIfNeeded();
        }, 2000);
    }

    checkSubscribers(): void {
        console.log('Connected$ observers:', (this.connectedSubject as any).observers?.length || 0);
        console.log('SensorData$ observers:', (this.sensorDataSubject as any).observers?.length || 0);
    }
}