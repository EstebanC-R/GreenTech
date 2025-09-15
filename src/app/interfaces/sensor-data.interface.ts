export interface SensorData {
    id: number;
    deviceCode: string;
    deviceName: string;
    temperaturaAmbiente: number;
    humedadAmbiente: number;
    temperaturaSuelo: number;
    humedadSuelo: number;
    batteryLevel: number;
    timestamp: string;
}

export interface Device {
    id: number;
    deviceCode: string;
    deviceName: string;
    userEmail: string;
    active: boolean;
    batteryLevel: number;
    lastSeen: string;
    registeredAt: string;
}

export interface User {
    email: string;
    fechaIngreso: string;
    idRol: number;
    estado: string;
    rol: string;
}

export interface LinkDeviceRequest {
    deviceCode: string;
    deviceName: string;
}

export interface DeviceStatusResponse {
    linked: boolean;
    userToken?: string;
    userName?: string;
    lastSeen?: string;
    batteryLevel?: number;
    active?: boolean;
}