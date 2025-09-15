import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { routes } from './app.routes';

// Importar tus servicios
import { SensorDataService } from './services/sensor-data.service';
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    
    // Agregar FormsModule y ReactiveFormsModule para que funcionen en componentes standalone
    importProvidersFrom(FormsModule, ReactiveFormsModule),
    
    // Tus servicios personalizados
    SensorDataService,
    AuthService,
    AuthGuard
  ]
};