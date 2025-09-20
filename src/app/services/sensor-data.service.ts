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
        console.log('🔧 DEBUG: SensorDataService constructor iniciado');
        console.log('🔧 DEBUG: API URL:', this.apiUrl);
    }

    public initializeIfNeeded(): void {
        if (this.initialized) {
            console.log('🔧 DEBUG: WebSocket ya inicializado');
            return;
        }

        const user = this.getCurrentUser();
        const token = localStorage.getItem('token');
        
        if (user && user.email && token) {
            console.log('✅ DEBUG: Inicializando WebSocket con usuario:', user.email);
            this.initializeWebSocket();
            this.initialized = true;
        } else {
            console.log('⚠️ DEBUG: No se puede inicializar - datos faltantes:', {
                user: !!user,
                email: user?.email,
                token: !!token
            });
        }
    }

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        console.log('🔧 DEBUG: Token obtenido:', token ? 'Token presente' : 'No token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }

    private initializeWebSocket(): void {
        const user = this.getCurrentUser();
        const token = localStorage.getItem('token');
        
        console.log('🔧 DEBUG: Inicializando WebSocket...');
        console.log('🔧 DEBUG: Usuario actual:', user);
        console.log('🔧 DEBUG: Token presente:', !!token);
        
        if (!user || !user.email || !token) {
            console.error('❌ DEBUG: Datos de autenticación incompletos', {
                user: !!user,
                email: user?.email,
                token: !!token
            });
            return;
        }

        const wsUrl = `${this.apiUrl.replace('/api', '')}/ws`;
        console.log('🔧 DEBUG: URL WebSocket construida:', wsUrl);
        console.log('🔧 DEBUG: Topic que se suscribirá:', `/topic/sensor-data/${user.email}`);

        // Si ya existe un cliente, desconectarlo primero
        if (this.stompClient) {
            console.log('🔧 DEBUG: Desconectando cliente anterior...');
            this.stompClient.deactivate();
        }

        this.stompClient = new Client({
            webSocketFactory: () => {
                console.log('🔧 DEBUG: Creando conexión SockJS a:', wsUrl);
                const socket = new SockJS(wsUrl);
                
                socket.onopen = () => {
                    console.log('✅ DEBUG: SockJS conexión abierta');
                };
                
                socket.onclose = (event) => {
                    console.log('❌ DEBUG: SockJS conexión cerrada:', event);
                    // Reintentar si no es un cierre intencional
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };
                
                socket.onerror = (error) => {
                    console.error('❌ DEBUG: Error en SockJS:', error);
                };
                
                return socket;
            },
            connectHeaders: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            debug: (str) => {
                console.log('🔧 STOMP Debug:', str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 10000, // Aumentar heartbeat
            heartbeatOutgoing: 10000,
            connectionTimeout: 30000, // Timeout más largo
        });

        this.stompClient.onConnect = (frame) => {
            console.log('✅ DEBUG: CONECTADO a WebSocket!');
            console.log('✅ DEBUG: Frame de conexión:', frame);
            console.log('✅ DEBUG: Headers de conexión:', frame.headers);
            
            this.connectedSubject.next(true);
            this.reconnectAttempts = 0; // Reset contador
            
            const topic = `/topic/sensor-data/${user.email}`;
            console.log('🔧 DEBUG: Intentando suscribirse al topic:', topic);
            
            try {
                const subscription = this.stompClient.subscribe(topic, (message) => {
                    console.log('📨 DEBUG: ¡MENSAJE WEBSOCKET RECIBIDO!');
                    console.log('📨 DEBUG: Headers del mensaje:', message.headers);
                    console.log('📨 DEBUG: Body crudo del mensaje:', message.body);
                    
                    try {
                        const rawData = JSON.parse(message.body);
                        console.log('📊 DEBUG: Datos crudos parseados:', rawData);
                        
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
                        
                        console.log('📊 DEBUG: Datos mapeados a SensorData:', sensorData);
                        this.sensorDataSubject.next(sensorData);
                        console.log('✅ DEBUG: Datos emitidos al BehaviorSubject');
                        
                    } catch (parseError) {
                        console.error('❌ DEBUG: Error parseando mensaje WebSocket:', parseError);
                        console.error('❌ DEBUG: Mensaje que causó error:', message.body);
                    }
                }, {
                    // Headers de suscripción adicionales
                    'Authorization': `Bearer ${token}`
                });
                
                console.log('✅ DEBUG: Suscripción completada:', subscription);
                
                // Enviar mensaje de ping para mantener viva la conexión
                setTimeout(() => {
                    if (this.stompClient.connected) {
                        this.sendKeepAlive();
                    }
                }, 5000);
                
            } catch (subscribeError) {
                console.error('❌ DEBUG: Error al suscribirse:', subscribeError);
            }
        };

        this.stompClient.onDisconnect = (frame) => {
            console.log('❌ DEBUG: Desconectado de WebSocket');
            console.log('❌ DEBUG: Frame de desconexión:', frame);
            this.connectedSubject.next(false);
            
            // Solo reintentar si no fue una desconexión intencional
            if (frame && frame.headers && frame.headers['receipt-id'] !== 'close-1') {
                this.scheduleReconnect();
            }
        };

        this.stompClient.onStompError = (frame) => {
            console.error('❌ DEBUG: Error STOMP:', frame);
            console.error('❌ DEBUG: Headers del error:', frame.headers);
            console.error('❌ DEBUG: Cuerpo del error:', frame.body);
            this.connectedSubject.next(false);
            
            // Verificar si es error de autenticación
            if (frame.headers && frame.headers['message'] && 
                frame.headers['message'].includes('Unauthorized')) {
                console.error('❌ DEBUG: Error de autenticación - token inválido o expirado');
                // Aquí podrías disparar un evento para refrescar el token
            }
        };

        this.stompClient.onWebSocketError = (error) => {
            console.error('❌ DEBUG: Error en WebSocket:', error);
        };

        this.stompClient.onWebSocketClose = (event) => {
            console.log('❌ DEBUG: WebSocket cerrado:', event);
            
            // Analizar el código de cierre
            switch (event.code) {
                case 1000:
                    console.log('ℹ️ DEBUG: Cierre normal');
                    break;
                case 1001:
                    console.log('⚠️ DEBUG: Endpoint desaparecido');
                    this.scheduleReconnect();
                    break;
                case 1006:
                    console.log('⚠️ DEBUG: Conexión perdida anormalmente');
                    this.scheduleReconnect();
                    break;
                default:
                    console.log(`⚠️ DEBUG: Código de cierre: ${event.code}, Razón: ${event.reason}`);
                    if (event.code !== 1000) {
                        this.scheduleReconnect();
                    }
            }
        };

        console.log('🔧 DEBUG: Activando cliente STOMP...');
        this.stompClient.activate();
    }

    // Nuevo método para enviar keep-alive
    private sendKeepAlive(): void {
        if (this.stompClient && this.stompClient.connected) {
            try {
                this.stompClient.publish({
                    destination: '/app/keep-alive',
                    body: JSON.stringify({ timestamp: new Date().toISOString() })
                });
                console.log('DEBUG: Keep-alive enviado');
                
                // Programar el siguiente keep-alive
                setTimeout(() => this.sendKeepAlive(), 30000); // Cada 30 segundos
            } catch (error) {
                console.error('❌ DEBUG: Error enviando keep-alive:', error);
            }
        }
    }

    // Método para programar reconexión
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ DEBUG: Máximo de reintentos de reconexión alcanzado');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Backoff exponencial
        
        console.log(`🔄 DEBUG: Programando reconexión en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            console.log('🔄 DEBUG: Reintentando conexión...');
            this.initialized = false;
            this.initializeIfNeeded();
        }, delay);
    }

    // API Methods (sin cambios)
    getUserDevices(): Observable<Device[]> {
        console.log('🔧 DEBUG: Obteniendo dispositivos del usuario...');
        return this.http.get<Device[]>(`${this.apiUrl}/user/devices`, {
            headers: this.getAuthHeaders()
        });
    }

    linkDevice(request: LinkDeviceRequest): Observable<any> {
        console.log('🔧 DEBUG: Vinculando dispositivo:', request);
        return this.http.post(`${this.apiUrl}/link-device`, request, {
            headers: this.getAuthHeaders()
        });
    }

    getSensorData(deviceCode?: string, hours: number = 24): Observable<SensorData[]> {
        let url = `${this.apiUrl}/user/sensor-data?hours=${hours}`;
        if (deviceCode) {
            url += `&deviceCode=${deviceCode}`;
        }
        console.log('🔧 DEBUG: Obteniendo datos históricos desde:', url);
        return this.http.get<SensorData[]>(url, {
            headers: this.getAuthHeaders()
        });
    }

    getLatestSensorData(deviceCode: string): Observable<SensorData> {
        console.log('🔧 DEBUG: Obteniendo últimos datos para device:', deviceCode);
        return this.http.get<SensorData>(`${this.apiUrl}/sensor-data/latest/${deviceCode}`, {
            headers: this.getAuthHeaders()
        });
    }

    private getCurrentUser() {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        console.log('🔧 DEBUG: Usuario desde localStorage:', user);
        return user;
    }

    disconnect(): void {
        console.log('🔧 DEBUG: Desconectando WebSocket manualmente...');
        this.reconnectAttempts = this.maxReconnectAttempts; // Evitar reconexión automática
        
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.deactivate();
        }
        this.connectedSubject.next(false);
        this.initialized = false;
    }

    // Métodos de debug y utilidad (sin cambios)
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
        console.log('🔧 DEBUG: Forzando reconexión...');
        this.reconnectAttempts = 0; // Reset contador
        this.disconnect();
        setTimeout(() => {
            this.initializeIfNeeded();
        }, 2000);
    }

    checkSubscribers(): void {
        console.log('📊 DEBUG: Verificando suscriptores:');
        console.log('Connected$ observers:', (this.connectedSubject as any).observers?.length || 0);
        console.log('SensorData$ observers:', (this.sensorDataSubject as any).observers?.length || 0);
    }
}