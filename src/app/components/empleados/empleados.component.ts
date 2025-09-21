import { AfterViewInit, Component} from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-empleados',
  imports: [RouterModule, CommonModule],
  standalone: true,
  templateUrl: './empleados.component.html',
  styleUrls: ['./empleados.component.css'],
})
export class EmpleadosComponent implements AfterViewInit {
  
  /* Barra de Busqueda */
  constructor(private http: HttpClient) {}
  /* ---------------------------------------//---------------------------------- */
  ngAfterViewInit(): void {
    (window as any).editarEmpleado = this.editarEmpleado.bind(this);
    (window as any).eliminarEmpleado = this.eliminarEmpleado.bind(this);

    
    const apiUrl = `${environment.apiUrl}/empleados`;
    const apiUrlArchivos = `${environment.apiUrl}/archivos`;

    function analizarErrorBackend(errorObj: any): string {
      console.log('=== ANALIZANDO ERROR MEJORADO ===');
      console.log('Error recibido:', errorObj);
      console.log('Tipo:', typeof errorObj);
      
      // Si es string, devolverlo directamente
      if (typeof errorObj === 'string') {
        return errorObj;
      }
      
      // Si no es objeto, convertir a string
      if (typeof errorObj !== 'object' || errorObj === null) {
        return String(errorObj);
      }
      
      let mensaje = '';
      
      // 1. Verificar si es un error de respuesta HTTP con datos JSON
      if (errorObj.response?.data) {
        const responseData = errorObj.response.data;
        
        // Prioridad al mensaje del response.data
        if (responseData.message && typeof responseData.message === 'string') {
          mensaje = responseData.message;
        } else if (responseData.error && typeof responseData.error === 'string') {
          mensaje = responseData.error;
        } else if (responseData.fields) {
          // Para errores de validación con múltiples campos
          const fieldErrors = Object.values(responseData.fields).join(', ');
          mensaje = `Errores de validación: ${fieldErrors}`;
        }
      }
      
      // 2. Si no se encontró en response.data, buscar en el objeto principal
      if (!mensaje) {
        if (errorObj.message && typeof errorObj.message === 'string') {
          mensaje = errorObj.message;
        } else if (errorObj.error && typeof errorObj.error === 'string') {
          mensaje = errorObj.error;
        } else if (errorObj.data?.message) {
          mensaje = errorObj.data.message;
        } else if (errorObj.data?.error) {
          mensaje = errorObj.data.error;
        }
      }
      
      // 3. Verificar errores específicos por status code
      if (!mensaje && errorObj.response?.status) {
        switch (errorObj.response.status) {
          case 409: // Conflict
            mensaje = 'Los datos ingresados ya existen en el sistema';
            break;
          case 400: // Bad Request
            mensaje = 'Los datos enviados no son válidos';
            break;
          case 404: // Not Found
            mensaje = 'Recurso no encontrado';
            break;
          case 500: // Internal Server Error
            mensaje = 'Error interno del servidor';
            break;
          default:
            mensaje = `Error del servidor (${errorObj.response.status})`;
        }
      }
      
      // 4. Verificar si es un error de red/conexión
      if (!mensaje && errorObj.name === 'TypeError' && errorObj.message?.includes('Failed to fetch')) {
        mensaje = 'No se pudo conectar al servidor. Verifique su conexión.';
      }
      
      // 5. Si aún no hay mensaje, usar uno genérico
      if (!mensaje) {
        // Intentar obtener algún texto descriptivo del error
        if (errorObj.statusText) {
          mensaje = `Error del servidor: ${errorObj.statusText}`;
        } else {
          mensaje = 'Error del servidor. Intente nuevamente.';
        }
      }
      
      console.log('Mensaje extraído:', mensaje);
      console.log('=== FIN ANÁLISIS DE ERROR ===');
      
      return mensaje;
    }

    // Función auxiliar para verificar duplicados antes del envío (opcional)
    async function verificarDuplicados(cedula: string, celular: string, correo: string, idEmpleadoExcluir?: number): Promise<string[]> {
      const errores: string[] = [];
      
      try {
        // Crear parámetros de consulta
        const params = new URLSearchParams();
        if (cedula) params.set('cedula', cedula.trim());
        if (celular) params.set('celular', celular.trim());
        if (correo) params.set('correo', correo.trim());
        if (idEmpleadoExcluir) params.set('excluir', idEmpleadoExcluir.toString());
        
        console.log('Verificando duplicados con parámetros:', params.toString());
        
        // Hacer petición al endpoint de verificación
        const response = await fetch(`${apiUrl}/verificar-duplicados?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const resultado = await response.json();
          console.log('Resultado de verificación:', resultado);
          
          if (resultado.cedulaExiste) {
            errores.push('Esta cédula ya está registrada en el sistema');
          }
          if (resultado.celularExiste) {
            errores.push('Este número de celular ya está registrado en el sistema');
          }
          if (resultado.correoExiste) {
            errores.push('Este correo electrónico ya está registrado en el sistema');
          }
        } else {
          console.warn('No se pudo verificar duplicados - status:', response.status);
          // No agregamos error aquí porque la verificación real será en el backend
        }
      } catch (error) {
        console.warn('Error al verificar duplicados:', error);
        // No lanzamos error aquí, solo log de advertencia
      }
      
      return errores;
    }

    // Función para mostrar errores específicos por campo
    function mostrarErrorEspecifico(error: any) {
      let mensaje = '';
      let tipo: 'error' | 'warning' | 'info' = 'error';
      
      // Verificar si es un error específico de campo
      if (error.response?.data?.field) {
        const field = error.response.data.field;
        const errorType = error.response.data.error;
        
        switch (errorType) {
          case 'cedula_duplicada':
            mensaje = 'Esta cédula ya está registrada. Por favor, verifique el número ingresado.';
            break;
          case 'celular_duplicado':
            mensaje = 'Este número de celular ya está registrado. Por favor, use otro número.';
            break;
          case 'correo_duplicado':
            mensaje = 'Este correo electrónico ya está registrado. Por favor, use otra dirección.';
            break;
          default:
            mensaje = analizarErrorBackend(error);
        }
      } else {
        mensaje = analizarErrorBackend(error);
      }
      
      return { mensaje, tipo };
    }


    interface Empleado {
      id: number;
      idUsuario: number;
      nombre: string;
      asignacion: string;
      cedula: string;
      fechaNacimiento: string;
      fechaDeIngreso: string;
      celular: string;
      correo: string;
      estado: EstadoEmpleado;
      epsArchivo: string;
      estudiosArchivo: string;
    }

    enum EstadoEmpleado {
      Activo = 'Activo',
      Inactivo = 'Inactivo',
      Suspendido = 'Suspendido'
    }

    // Función para sanitizar el texto
    function sanitizeText(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // FUNCIÓN PARA SUBIR ARCHIVOS (después de crear el empleado)
    async function subirArchivosEmpleado(employeeId: number, epsFile?: File, estudiosFile?: File): Promise<void> {
      try {
        if (epsFile) {
          const formDataEPS = new FormData();
          formDataEPS.append('file', epsFile);
          
          const responseEPS = await fetch(`${apiUrlArchivos}/${employeeId}/eps`, {
            method: 'POST',
            body: formDataEPS
          });
          
          if (!responseEPS.ok) {
            throw new Error(`Error al subir archivo EPS: ${responseEPS.status}`);
          }
        }
        
        if (estudiosFile) {
          const formDataEstudios = new FormData();
          formDataEstudios.append('file', estudiosFile);
          
          const responseEstudios = await fetch(`${apiUrlArchivos}/${employeeId}/studies`, {
            method: 'POST',
            body: formDataEstudios
          });
          
          if (!responseEstudios.ok) {
            throw new Error(`Error al subir archivo de estudios: ${responseEstudios.status}`);
          }
        }
      } catch (error) {
        console.error('Error al subir archivos:', error);
        throw error;
      }
    }

    // Función para validar datos del formulario
    function validarDatosFormulario(nombre: string, asignacion: string, cedula: string, 
    fechaNacimiento: string, fechaDeIngreso: string, celular: string, correo: string, estado: string): { valido: boolean, errores: string[] } {
      const errores: string[] = [];

      // Validar nombre
      if (!nombre.trim()) {
        errores.push('El nombre es obligatorio');
      } else if (nombre.trim().length < 3) {
        errores.push('El nombre debe tener al menos 3 caracteres');
      } else if (nombre.trim().length > 50) {
        errores.push('El nombre no puede exceder 50 caracteres');
      }

      // Validar asignación
      if (!asignacion.trim()) {
        errores.push('La asignación es obligatoria');
      } else if (asignacion.trim().length < 5) {
        errores.push('La asignación debe tener al menos 5 caracteres');
      } else if (asignacion.trim().length > 50) {
        errores.push('La asignación no puede exceder 50 caracteres');
      }

      // Validar cédula
      if (!cedula.trim()) {
        errores.push('La cédula es obligatoria');
      } else if (cedula.trim().length < 6) { // Más flexible para diferentes tipos de documento
        errores.push('La cédula debe tener al menos 6 caracteres');
      } else if (cedula.trim().length > 10) {
        errores.push('La cédula no puede exceder 10 caracteres');
      } else if (!cedula.match(/^\d+$/)) {
        errores.push('La cédula debe ser numérica');
      }


      // Validar fecha de nacimiento
      if (!fechaNacimiento.trim()) {
        errores.push('La fecha de nacimiento es obligatoria');
      } else {
        const fechaNac = new Date(fechaNacimiento);
        const hoy = new Date();
        if (isNaN(fechaNac.getTime())) {
          errores.push('La fecha de nacimiento no es válida');
        } else if (fechaNac >= hoy) {
          errores.push('La fecha de nacimiento debe ser anterior a hoy');
        }
        // Validar edad mínima
        const edad = hoy.getFullYear() - fechaNac.getFullYear();
        if (edad < 18) {
          errores.push('El empleado debe tener al menos 18 años');
        }
      }

      // Validar fecha de ingreso
      if (!fechaDeIngreso.trim()) {
        errores.push('La fecha de ingreso es obligatoria');
      } else {
        const fechaIng = new Date(fechaDeIngreso);
        if (isNaN(fechaIng.getTime())) {
          errores.push('La fecha de ingreso no es válida');
        }
        // Validar que no sea futura
        const hoy = new Date();
        if (fechaIng > hoy) {
          errores.push('La fecha de ingreso no puede ser futura');
        }
      }

      // Validar celular
      if (!celular.trim()) {
        errores.push('El celular es obligatorio');
      } else if (celular.trim().length < 10) {
        errores.push('El celular debe tener al menos 10 caracteres');
      } else if (celular.trim().length > 10) {
        errores.push('El celular no puede exceder 10 caracteres');
      } else if (!celular.match(/^\d+$/)) {
        errores.push('El celular debe ser numérico');
      }

      // Validar correo
      if (!correo.trim()) {
        errores.push('El correo es obligatorio');
      } else if (correo.trim().length > 100) {
        errores.push('El correo no puede exceder 100 caracteres');
      } else if (!correo.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errores.push('El correo no es válido');
      }

      // Validar estado
      if (!estado.trim()) {
        errores.push('El estado es obligatorio');
      } else if (!Object.values(EstadoEmpleado).includes(estado as EstadoEmpleado)) {
        errores.push('El estado debe ser Activo, Inactivo o Suspendido');
      }

      return {
        valido: errores.length === 0,
        errores
      };
    }

    // Función para mostrar modal de confirmación
    function mostrarConfirmacion(mensaje: string): Promise<boolean> {
      return new Promise((resolve) => {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        `;

        // Crear modal
        const modal = document.createElement('div');
        modal.style.cssText = `
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          text-align: center;
        `;

        modal.innerHTML = `
          <h3 style="margin-top: 0; color: #333;">Confirmar acción</h3>
          <p style="color: #666; margin: 20px 0;">${mensaje}</p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="cancelar-modal" style="
              padding: 10px 20px;
              background-color: #ccc;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              color: #333;
            ">Cancelar</button>
            <button id="confirmar-modal" style="
              padding: 10px 20px;
              background-color: #FF6B6B;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            ">Confirmar</button>
          </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Event listeners
        modal.querySelector('#cancelar-modal')?.addEventListener('click', () => {
          document.body.removeChild(overlay);
          resolve(false);
        });

        modal.querySelector('#confirmar-modal')?.addEventListener('click', () => {
          document.body.removeChild(overlay);
          resolve(true);
        });

        // Cerrar con Escape
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
            resolve(false);
          }
        };
        document.addEventListener('keydown', handleEscape);
      });
    }
    

    function obtenerEmpleados(){
      // Mostrar indicador de carga
      const listaEmpleados = document.getElementById("lista-empleados");
      if (listaEmpleados) {
        listaEmpleados.innerHTML = "<p style= 'text-align: center; padding: 20px;'<Cargando Empleados...></p>";
      }


      fetch(apiUrl)
        .then(res=>{
          if (!res.ok) {
            throw new Error (`Error del servidor: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .then((data: Empleado[]) => {
          if (listaEmpleados){
            // Limpiar el contenedor
            listaEmpleados.innerHTML = "";

            // Configurar estilos del contenedor
            listaEmpleados.style.backgroundColor = "transparent";
            listaEmpleados.style.boxShadow = "none";
            listaEmpleados.style.width = "100%";
            listaEmpleados.style.padding = "15px 0";

            if (data.length === 0) {
              listaEmpleados.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #64748b; font-family: 'Segoe UI', Roboto, sans-serif;">
                  <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.5;">👥</div>
                  <p style="font-size: 16px; font-weight: 500; margin: 0;">No hay empleados disponibles</p>
                </div>
              `;
              return;
            }
            
            data.forEach((datos: Empleado) => {
              // Crear una nueva tarjeta para cada empleado
              const nuevaTarjeta = document.createElement("div");
              nuevaTarjeta.className = "card blue-cake employee-card";

              // Configuración de estilos de la tarjeta más compactos
              nuevaTarjeta.style.cssText = `
                background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
                box-shadow: 0 6px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04);
                border: 1px solid rgba(226, 232, 240, 0.8);
                border-radius: 14px;
                padding: 20px;
                width: 70%;
                min-width: 360px;
                max-width: 900px;
                margin: 0 auto 20px auto;
                text-align: left;
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
                color: #1e293b;
                position: relative;
                transition: all 0.3s ease;
                overflow: hidden;
              `;

              // Añadir pseudo-elemento decorativo
              const decorativeElement = document.createElement('div');
              decorativeElement.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 50%, #7c3aed 100%);
                border-radius: 14px 14px 0 0;
              `;
              nuevaTarjeta.appendChild(decorativeElement);

              // Efectos hover
              nuevaTarjeta.addEventListener('mouseenter', () => {
                nuevaTarjeta.style.transform = 'translateY(-1px)';
                nuevaTarjeta.style.boxShadow = '0 8px 32px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.08)';
              });

              nuevaTarjeta.addEventListener('mouseleave', () => {
                nuevaTarjeta.style.transform = 'translateY(0)';
                nuevaTarjeta.style.boxShadow = '0 6px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)';
              });

              // Crear header de la tarjeta más compacto
              const cardHeader = document.createElement("div");
              cardHeader.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e2e8f0;
              `;

              const leftHeader = document.createElement("div");
              leftHeader.style.cssText = `
                display: flex;
                align-items: center;
              `;

              const avatarContainer = document.createElement("div");
              avatarContainer.style.cssText = `
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                font-size: 18px;
                font-weight: 600;
                color: white;
                text-transform: uppercase;
                box-shadow: 0 3px 8px rgba(59, 130, 246, 0.3);
              `;
              avatarContainer.textContent = datos.nombre.charAt(0);

              const nameContainer = document.createElement("div");
              nameContainer.innerHTML = `
                <h2 style="
                  margin: 0 0 2px 0;
                  font-size: 20px;
                  font-weight: 700;
                  color: #1e293b;
                  line-height: 1.2;
                ">${sanitizeText(datos.nombre)}</h2>
                <p style="
                  margin: 0;
                  font-size: 14px;
                  color: #64748b;
                  font-weight: 500;
                ">${sanitizeText(datos.asignacion)}</p>
              `;

              // Estado compacto en el header
              const estadoContainer = document.createElement("div");
              const estadoColor = datos.estado.toLowerCase() === 'activo' ? '#10b981' : '#ef4444';
              estadoContainer.style.cssText = `
                background: ${estadoColor}15;
                border: 1px solid ${estadoColor}30;
                border-radius: 20px;
                padding: 6px 12px;
                display: flex;
                align-items: center;
                gap: 6px;
              `;

              estadoContainer.innerHTML = `
                <span style="font-size: 12px;">${datos.estado.toLowerCase() === 'activo' ? '✅' : '❌'}</span>
                <span style="
                  font-size: 12px;
                  font-weight: 600;
                  color: ${estadoColor};
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                ">${sanitizeText(datos.estado)}</span>
              `;

              leftHeader.appendChild(avatarContainer);
              leftHeader.appendChild(nameContainer);
              cardHeader.appendChild(leftHeader);
              cardHeader.appendChild(estadoContainer);
              nuevaTarjeta.appendChild(cardHeader);

              // Crear grid compacto para la información principal
              const mainInfoGrid = document.createElement("div");
              mainInfoGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 12px;
                margin-bottom: 16px;
              `;

              // Función para crear elementos de información compactos
              const createCompactInfoItem = (label: string, value: string, icon: string = '') => {
                const item = document.createElement("div");
                item.style.cssText = `
                  background: #f8fafc;
                  padding: 10px 14px;
                  border-radius: 8px;
                  border-left: 3px solid #3b82f6;
                  transition: all 0.2s ease;
                `;

                item.addEventListener('mouseenter', () => {
                  item.style.backgroundColor = '#f1f5f9';
                  item.style.transform = 'translateX(1px)';
                });

                item.addEventListener('mouseleave', () => {
                  item.style.backgroundColor = '#f8fafc';
                  item.style.transform = 'translateX(0)';
                });

                item.innerHTML = `
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                      <p style="
                        margin: 0 0 2px 0;
                        font-size: 11px;
                        font-weight: 600;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                      ">${label}</p>
                      <p style="
                        margin: 0;
                        font-size: 14px;
                        font-weight: 500;
                        color: #1e293b;
                        line-height: 1.3;
                      ">${value}</p>
                    </div>
                    ${icon ? `<span style="font-size: 16px; opacity: 0.6;">${icon}</span>` : ''}
                  </div>
                `;
                return item;
              };
              // Crear elementos de información principales
              mainInfoGrid.appendChild(createCompactInfoItem("Cédula", sanitizeText(datos.cedula), "💳"));
              mainInfoGrid.appendChild(createCompactInfoItem("F. Nacimiento", sanitizeText(formatearFechaParaInput(datos.fechaNacimiento)), "📅"));
              mainInfoGrid.appendChild(createCompactInfoItem("F. Ingreso", sanitizeText(formatearFechaParaInput(datos.fechaDeIngreso)), "📥"));
              mainInfoGrid.appendChild(createCompactInfoItem("Celular", sanitizeText(datos.celular), "📱"));
              mainInfoGrid.appendChild(createCompactInfoItem("Correo", sanitizeText(datos.correo), "📧"));

              nuevaTarjeta.appendChild(mainInfoGrid);

              // Sección de archivos compacta
              const archivosSection = document.createElement("div");
              archivosSection.style.cssText = `
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                border: 1px solid #e2e8f0;
              `;

              archivosSection.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <h3 style="
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #475569;
                    display: flex;
                    align-items: center;
                  ">
                    <span style="margin-right: 6px;">📁</span>
                    Documentos
                  </h3>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px;">
                  <div style="
                    background: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s ease;
                  " onmouseover="this.style.backgroundColor='#f8fafc'; this.style.borderColor='#3b82f6';" 
                     onmouseout="this.style.backgroundColor='white'; this.style.borderColor='#e2e8f0';">
                    <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">EPS</p>
                    <a href="#" onclick="descargarArchivo(${datos.id}, 'eps')" style="
                      color: #3b82f6;
                      text-decoration: none;
                      font-weight: 500;
                      display: flex;
                      align-items: center;
                      font-size: 12px;
                    " onmouseover="this.style.color='#1d4ed8';" onmouseout="this.style.color='#3b82f6';">
                      <span style="margin-right: 4px;">📄</span>
                      ${sanitizeText(datos.epsArchivo)}
                    </a>
                  </div>
                  <div style="
                    background: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s ease;
                  " onmouseover="this.style.backgroundColor='#f8fafc'; this.style.borderColor='#3b82f6';" 
                     onmouseout="this.style.backgroundColor='white'; this.style.borderColor='#e2e8f0';">
                    <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Estudios</p>
                    <a href="#" onclick="descargarArchivo(${datos.id}, 'studies')" style="
                      color: #3b82f6;
                      text-decoration: none;
                      font-weight: 500;
                      display: flex;
                      align-items: center;
                      font-size: 12px;
                    " onmouseover="this.style.color='#1d4ed8';" onmouseout="this.style.color='#3b82f6';">
                      <span style="margin-right: 4px;">🎓</span>
                      ${sanitizeText(datos.estudiosArchivo)}
                    </a>
                  </div>
                </div>
              `;

              nuevaTarjeta.appendChild(archivosSection);

              // Contenedor para los botones más compacto
              const botonesContainer = document.createElement('div');
              botonesContainer.style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #e2e8f0;
              `;

              // Crear el botón de actualizar más compacto
              const botonActualizar = document.createElement('button');
              botonActualizar.innerText = 'Actualizar';
              botonActualizar.className = 'btn-update';
              botonActualizar.style.cssText = `
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 16px;
                cursor: pointer;
                font-weight: 600;
                font-size: 12px;
                letter-spacing: 0.02em;
                transition: all 0.3s ease;
                box-shadow: 0 3px 8px rgba(16, 185, 129, 0.3);
                display: flex;
                align-items: center;
                gap: 6px;
                position: relative;
                overflow: hidden;
              `;

              botonActualizar.innerHTML = `
                <span>Actualizar</span>
              `;

              botonActualizar.addEventListener('mouseover', () => {
                botonActualizar.style.transform = 'translateY(-1px)';
                botonActualizar.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
              });

              botonActualizar.addEventListener('mouseout', () => {
                botonActualizar.style.transform = 'translateY(0)';
                botonActualizar.style.boxShadow = '0 3px 8px rgba(16, 185, 129, 0.3)';
              });

              botonActualizar.addEventListener('click', () => {
                mostrarFormularioActualizacion(datos, nuevaTarjeta);
              });

              // Crear el botón de eliminar más compacto
              const botonEliminar = document.createElement('button');
              botonEliminar.innerText = 'Eliminar';
              botonEliminar.className = 'btn-delete';
              botonEliminar.style.cssText = `
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 16px;
                cursor: pointer;
                font-weight: 600;
                font-size: 12px;
                letter-spacing: 0.02em;
                transition: all 0.3s ease;
                box-shadow: 0 3px 8px rgba(239, 68, 68, 0.3);
                display: flex;
                align-items: center;
                gap: 6px;
                position: relative;
                overflow: hidden;
              `;

              botonEliminar.innerHTML = `
                <span>Eliminar</span>
              `;

              botonEliminar.addEventListener('mouseover', () => {
                botonEliminar.style.transform = 'translateY(-1px)';
                botonEliminar.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
              });

              botonEliminar.addEventListener('mouseout', () => {
                botonEliminar.style.transform = 'translateY(0)';
                botonEliminar.style.boxShadow = '0 3px 8px rgba(239, 68, 68, 0.3)';
              });

              // Confirmación antes de eliminar (mantenida exactamente igual)
              botonEliminar.addEventListener('click', async () => {
                const confirmado = await mostrarConfirmacion(
                  `¿Estás seguro de que deseas eliminar al trabajador "${datos.nombre}"? Esta acción no se puede deshacer. Recomendamos simplemente cambiar el estado de Activo a Inactivo, en caso de que no se quiera eliminar permanentemente.`
                );
                
                if (confirmado) {
                  // Deshabilitar botón durante la eliminación
                  botonEliminar.disabled = true;
                  botonEliminar.innerHTML = `
                    <span>⏳</span>
                    <span>Eliminando...</span>
                  `;
                  
                  fetch(`${apiUrl}/${datos.id}`, { method: 'DELETE' })
                    .then(response => {
                      if (!response.ok) {
                        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
                      }
                      mostrarNotificacion('Empleado eliminado exitosamente', 'success');
                      nuevaTarjeta.remove();
                    })
                    .catch(error => {
                      console.error('Error en la eliminación:', error);
                      mostrarNotificacion('Error al eliminar el empleado: ' + error.message, 'error');
                      // Rehabilitar botón en caso de error
                      botonEliminar.disabled = false;
                      botonEliminar.innerHTML = `
                        <span>🗑️</span>
                        <span>Eliminar</span>
                      `;
                    });
                }
              });

              // Añadir los botones al contenedor
              botonesContainer.appendChild(botonActualizar);
              botonesContainer.appendChild(botonEliminar);

              // Añadir el contenedor de botones a la tarjeta
              nuevaTarjeta.appendChild(botonesContainer);

              // Añadir la tarjeta al contenedor
              listaEmpleados.appendChild(nuevaTarjeta);
            });
          }
        })
        .catch(error => {
          console.error('Error al obtener empleados:', error);
          if (listaEmpleados) {
            listaEmpleados.innerHTML = `
              <p style="text-align: center; padding: 20px; color: #FF6B6B;">Error al cargar los empleados: ${error.message}</p>
            `;
          }
          mostrarNotificacion('Error al cargar los empleados', 'error');
        });
    }
    // Función para mostrar el formulario de actualización
    function mostrarFormularioActualizacion(datos: Empleado, tarjeta: HTMLElement) {      
      // Verificar si ya hay un formulario abierto
      const formularioExistente = tarjeta.querySelector('form');
      if (formularioExistente) {
        mostrarNotificacion('Ya hay un formulario de edición abierto', 'error');
        return;
      }

      // Crear el contenedor del formulario (NO el form directamente)
      const contenedorFormulario = document.createElement('div');
      contenedorFormulario.style.marginTop = '20px';
      contenedorFormulario.style.padding = '20px';
      contenedorFormulario.style.backgroundColor = '#f9f9f9';
      contenedorFormulario.style.borderRadius = '8px';
      contenedorFormulario.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
      contenedorFormulario.style.border = '1px solid #e0e0e0';

      // Crear el HTML del formulario
      contenedorFormulario.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 2px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          margin: 10px 0;
        ">
          <div style="
            background: white;
            border-radius: 14px;
            padding: 32px;
            position: relative;
            overflow: hidden;
          ">
            <!-- Decoración de fondo -->
            <div style="
              position: absolute;
              top: -50px;
              right: -50px;
              width: 100px;
              height: 100px;
              background: linear-gradient(45deg, #667eea20, #764ba220);
              border-radius: 50%;
            "></div>
            
            <!-- Título principal -->
            <div style="text-align: center; margin-bottom: 32px; position: relative;">
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 12px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 50px;
                color: white;
                font-size: 18px;
                font-weight: 600;
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
              ">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Actualizar Empleado
              </div>
            </div>

            <form id="form-actualizar-${datos.id}" style="position: relative;">
              <!-- Sección de información personal -->
              <div style="margin-bottom: 28px;">
                <h4 style="
                  color: #4a5568;
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0 0 20px 0;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    width: 8px;
                    height: 8px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    border-radius: 50%;
                  "></div>
                  Información Personal
                </h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                  <!-- Nombre -->
                  <div style="position: relative;">
                    <label for="update-nombre-${datos.id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Nombre <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <div style="position: relative;">
                      <input 
                        type="text" 
                        id="update-nombre-${datos.id}" 
                        name="nombre" 
                        value="${sanitizeText(datos.nombre)}"
                        maxlength="50"
                        required
                        style="
                          width: 100%;
                          padding: 14px 16px;
                          border: 2px solid #e2e8f0;
                          border-radius: 12px;
                          font-size: 14px;
                          background: #fafafa;
                          transition: all 0.3s ease;
                          box-sizing: border-box;
                        "
                        onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                        onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                      />
                    </div>
                  </div>

                  <!-- Asignación -->
                  <div style="position: relative;">
                    <label for="update-asignacion-${datos.id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Asignación <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="update-asignacion-${datos.id}" 
                      name="asignacion" 
                      value="${sanitizeText(datos.asignacion)}"
                      maxlength="50"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                  <!-- Cédula -->
                  <div style="position: relative;">
                    <label for="update-cedula-${datos.id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Cédula <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="update-cedula-${datos.id}" 
                      name="cedula" 
                      value="${sanitizeText(datos.cedula)}"
                      maxlength="10"
                      pattern="[0-9]+"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>

                  <!-- Celular -->
                  <div style="position: relative;">
                    <label for="update-celular-${datos.id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Celular <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="tel" 
                      id="update-celular-${datos.id}" 
                      name="celular" 
                      value="${sanitizeText(datos.celular)}"
                      maxlength="10"
                      pattern="[0-9]+"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>
                </div>

                <!-- Correo (campo completo) -->
                <div style="margin-bottom: 20px;">
                  <label for="update-correo-${datos.id}" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                    font-size: 14px;
                  ">
                    Correo Electrónico <span style="color: #e53e3e; font-size: 16px;">*</span>
                  </label>
                  <input 
                    type="email" 
                    id="update-correo-${datos.id}" 
                    name="correo" 
                    value="${sanitizeText(datos.correo)}"
                    maxlength="100"
                    required
                    style="
                      width: 100%;
                      padding: 14px 16px;
                      border: 2px solid #e2e8f0;
                      border-radius: 12px;
                      font-size: 14px;
                      background: #fafafa;
                      transition: all 0.3s ease;
                      box-sizing: border-box;
                    "
                    onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                    onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                  />
                </div>
              </div>

              <!-- Sección de fechas -->
              <div style="margin-bottom: 28px;">
                <h4 style="
                  color: #4a5568;
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0 0 20px 0;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    width: 8px;
                    height: 8px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    border-radius: 50%;
                  "></div>
                  Fechas Importantes
                </h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <!-- Fecha de Nacimiento -->
                  <div>
                    <label for="update-fechaNacimiento-${datos.id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Fecha de Nacimiento <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="date" 
                      id="update-fechaNacimiento-${datos.id}" 
                      name="fechaNacimiento" 
                      value="${formatearFechaParaInput(datos.fechaNacimiento)}"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>

                  <!-- Fecha de Ingreso -->
                  <div>
                    <label for="update-fechaDeIngreso-${datos.id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Fecha de Ingreso <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="date" 
                      id="update-fechaDeIngreso-${datos.id}" 
                      name="fechaDeIngreso" 
                      value="${formatearFechaParaInput(datos.fechaDeIngreso)}"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>
                </div>
              </div>

              <!-- Sección de estado -->
              <div style="margin-bottom: 28px;">
                <h4 style="
                  color: #4a5568;
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0 0 20px 0;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    width: 8px;
                    height: 8px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    border-radius: 50%;
                  "></div>
                  Estado del Empleado
                </h4>
                
                <div>
                  <label for="update-estado-${datos.id}" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                    font-size: 14px;
                  ">
                    Estado <span style="color: #e53e3e; font-size: 16px;">*</span>
                  </label>
                  <select 
                    id="update-estado-${datos.id}" 
                    name="estado" 
                    required
                    style="
                      width: 100%;
                      padding: 14px 16px;
                      border: 2px solid #e2e8f0;
                      border-radius: 12px;
                      font-size: 14px;
                      background: #fafafa;
                      transition: all 0.3s ease;
                      box-sizing: border-box;
                      cursor: pointer;
                    "
                    onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                    onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                  >
                    <option value="Activo" ${datos.estado === 'Activo' ? 'selected' : ''}>✅ Activo</option>
                    <option value="Inactivo" ${datos.estado === 'Inactivo' ? 'selected' : ''}>⏸️ Inactivo</option>
                    <option value="Suspendido" ${datos.estado === 'Suspendido' ? 'selected' : ''}>⛔ Suspendido</option>
                  </select>
                </div>
              </div>

              <!-- Sección de archivos -->
              <div style="
                background: linear-gradient(135deg, #fef7e0, #fef3c7);
                padding: 24px;
                border-radius: 16px;
                margin-bottom: 28px;
                border: 2px solid #fbbf24;
                position: relative;
                overflow: hidden;
              ">
                <div style="
                  position: absolute;
                  top: -20px;
                  right: -20px;
                  width: 60px;
                  height: 60px;
                  background: rgba(251, 191, 36, 0.1);
                  border-radius: 50%;
                "></div>
                
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 16px;
                  position: relative;
                ">
                  <div style="
                    padding: 8px;
                    background: #fbbf24;
                    border-radius: 8px;
                    color: white;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600;">
                      Actualizar Archivos
                    </h4>
                    <p style="margin: 4px 0 0 0; color: #b45309; font-size: 14px;">
                      Opcional: Deja vacío para mantener los archivos actuales
                    </p>
                  </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div>
                    <label style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #92400e;
                      font-size: 14px;
                    ">
                      📄 Archivo EPS:
                    </label>
                    <input 
                      type="file" 
                      name="archivoEPS" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      style="
                        width: 100%;
                        padding: 12px;
                        border: 2px dashed #fbbf24;
                        border-radius: 12px;
                        background: rgba(255, 255, 255, 0.7);
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onmouseover="this.style.background='rgba(255, 255, 255, 1)'; this.style.borderColor='#f59e0b'"
                      onmouseout="this.style.background='rgba(255, 255, 255, 0.7)'; this.style.borderColor='#fbbf24'"
                    />
                  </div>
                  <div>
                    <label style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #92400e;
                      font-size: 14px;
                    ">
                      🎓 Archivo de Estudios:
                    </label>
                    <input 
                      type="file" 
                      name="archivoEstudios" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      style="
                        width: 100%;
                        padding: 12px;
                        border: 2px dashed #fbbf24;
                        border-radius: 12px;
                        background: rgba(255, 255, 255, 0.7);
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onmouseover="this.style.background='rgba(255, 255, 255, 1)'; this.style.borderColor='#f59e0b'"
                      onmouseout="this.style.background='rgba(255, 255, 255, 0.7)'; this.style.borderColor='#fbbf24'"
                    />
                  </div>
                </div>
              </div>

              <!-- Errores de validación -->
              <div id="errores-validacion" style="margin-bottom: 20px;"></div>
              
              <!-- Botones de acción -->
              <div style="
                display: flex;
                gap: 16px;
                justify-content: flex-end;
                padding-top: 20px;
                border-top: 2px solid #f7fafc;
              ">
                <button 
                  type="button" 
                  id="btn-cancelar-${datos.id}"
                  style="
                    padding: 14px 28px;
                    background: #f7fafc;
                    color: #4a5568;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                  "
                  onmouseover="this.style.background='#edf2f7'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                  onmouseout="this.style.background='#f7fafc'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cancelar
                </button>
                
                <button 
                  type="submit" 
                  id="btn-guardar-${datos.id}"
                  style="
                    padding: 14px 28px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
                  "
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(102, 126, 234, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(102, 126, 234, 0.3)'"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                  </svg>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      // Añadir el contenedor a la tarjeta
      tarjeta.appendChild(contenedorFormulario);

      // Obtener referencias a los elementos después de que se hayan creado
      const formulario = contenedorFormulario.querySelector(`#form-actualizar-${datos.id}`) as HTMLFormElement;
      const btnCancelar = contenedorFormulario.querySelector(`#btn-cancelar-${datos.id}`) as HTMLButtonElement;
      const btnGuardar = contenedorFormulario.querySelector(`#btn-guardar-${datos.id}`) as HTMLButtonElement;

      // ✅ EVENT LISTENER PARA CANCELAR (CON PREVENCIÓN DE PROPAGACIÓN)
      if (btnCancelar) {
        btnCancelar.addEventListener('click', (e) => {
          e.preventDefault(); // Prevenir comportamiento por defecto
          e.stopPropagation(); // Detener propagación del evento
          console.log('Botón cancelar clickeado'); // Debug
          contenedorFormulario.remove();
          mostrarNotificacion('Edición cancelada', 'info');
        });
      }

      // ✅ EVENT LISTENER ÚNICO PARA EL FORMULARIO
      if (formulario) {
        formulario.addEventListener('submit', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          console.log('Formulario enviado'); // Debug

          // Obtener elementos del formulario
          const nombreInput = formulario.querySelector(`#update-nombre-${datos.id}`) as HTMLInputElement;
          const asignacionInput = formulario.querySelector(`#update-asignacion-${datos.id}`) as HTMLInputElement;
          const cedulaInput = formulario.querySelector(`#update-cedula-${datos.id}`) as HTMLInputElement;
          const fechaNacimientoInput = formulario.querySelector(`#update-fechaNacimiento-${datos.id}`) as HTMLInputElement;
          const fechaIngresoInput = formulario.querySelector(`#update-fechaDeIngreso-${datos.id}`) as HTMLInputElement;
          const celularInput = formulario.querySelector(`#update-celular-${datos.id}`) as HTMLInputElement;
          const correoInput = formulario.querySelector(`#update-correo-${datos.id}`) as HTMLInputElement;
          const estadoInput = formulario.querySelector(`#update-estado-${datos.id}`) as HTMLSelectElement;
          const archivoEPSInput = formulario.querySelector('input[name="archivoEPS"]') as HTMLInputElement;
          const archivoEstudiosInput = formulario.querySelector('input[name="archivoEstudios"]') as HTMLInputElement;

          // Validar que todos los elementos existan
          if (!nombreInput || !asignacionInput || !cedulaInput || !fechaNacimientoInput || 
              !fechaIngresoInput || !celularInput || !correoInput || !estadoInput) {
            mostrarNotificacion('Error: No se pudieron obtener todos los campos del formulario', 'error');
            return;
          }

          // Validar datos del formulario
          const validacion = validarDatosFormulario(
            nombreInput.value,
            asignacionInput.value,
            cedulaInput.value,
            fechaNacimientoInput.value,
            fechaIngresoInput.value,
            celularInput.value,
            correoInput.value,
            estadoInput.value
          );

          if (!validacion.valido) {
            mostrarErroresFormularioEmpleado(validacion.errores);
            return;
          }

          // Deshabilitar botón durante el envío
          if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerText = 'Guardando...';
          }

          try {
            // Actualizar datos básicos del empleado (sin archivos)
            const empleadoData = {
              idUsuario: datos.idUsuario,
              nombre: nombreInput.value.trim(),
              asignacion: asignacionInput.value.trim(),
              cedula: cedulaInput.value.trim(),
              fechaNacimiento: fechaNacimientoInput.value,
              fechaDeIngreso: fechaIngresoInput.value,
              celular: celularInput.value.trim(),
              correo: correoInput.value.trim(),
              estado: estadoInput.value,
              // Mantener nombres de archivos existentes
              epsArchivo: datos.epsArchivo,
              estudiosArchivo: datos.estudiosArchivo
            };

            // Enviar actualización de datos básicos
            const response = await fetch(`${apiUrl}/${datos.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(empleadoData)
            });

            if (!response.ok) {
              console.log('Status de respuesta de error:', response.status);
              
              let errorData;
              
              try {
                // El backend SIEMPRE envía JSON, así que parseamos directamente
                errorData = await response.json();
                console.log('Error de actualización parseado como JSON:', errorData);
              } catch (parseError) {
                console.log('No se pudo parsear como JSON, obteniendo texto:', parseError);
                // Solo si falla el JSON, obtener como texto
                const text = await response.text();
                errorData = {
                  message: text || 'Error desconocido',
                  error: 'error_servidor',
                  status: response.status
                };
                console.log('Error de actualización creado manualmente:', errorData);
              }
              
              // LANZAR EL OBJETO DIRECTAMENTE
              throw errorData;
            }

            const responseData = await response.json();
            console.log("Datos básicos actualizados:", responseData);

            // Ahora actualizar archivos si se seleccionaron nuevos
            const epsFile = archivoEPSInput?.files?.[0];
            const estudiosFile = archivoEstudiosInput?.files?.[0];

            if (epsFile || estudiosFile) {
              try {
                await subirArchivosEmpleado(datos.id, epsFile, estudiosFile);
                console.log('Archivos actualizados exitosamente');
              } catch (archivoError) {
                console.error('Error al actualizar archivos:', archivoError);
                const mensajeError = archivoError instanceof Error 
                  ? archivoError.message 
                  : 'Error desconocido al subir archivos';
                mostrarNotificacion('Datos actualizados pero hubo un error con los archivos: ' + mensajeError, 'error');
                return;
              }
            }

            mostrarNotificacion('Empleado actualizado exitosamente', 'success');
            contenedorFormulario.remove();
            obtenerEmpleados();

          } catch (error) {
            console.error('Error al actualizar empleado:', error);
            
            // MOSTRAR MENSAJE PERSONALIZADO PARA CAMPOS ÚNICOS
            const mensajeError = error instanceof Error ? error.message : 'Error desconocido';
            mostrarNotificacion(mensajeError, 'error');
          } finally {
            // Rehabilitar botón
            if (btnGuardar) {
              btnGuardar.disabled = false;
              btnGuardar.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17,21 17,13 7,13 7,21"/>
                  <polyline points="7,3 7,8 15,8"/>
                </svg>
                Guardar Cambios
              `;
            }
          }
        });
      }

      // FUNCIÓN PARA MOSTRAR ERRORES DE VALIDACIÓN
      function mostrarErroresValidacion(errores: string[]) {
        const contenedorErrores = contenedorFormulario.querySelector('#errores-validacion');
        if (contenedorErrores) {
          if (errores.length > 0) {
            contenedorErrores.innerHTML = `
              <div style="background-color: #ffebee; border: 1px solid #ffcdd2; border-radius: 4px; padding: 10px;">
                <strong style="color: #c62828;">Errores de validación:</strong>
                <ul style="margin: 5px 0 0 20px; color: #c62828;">
                  ${errores.map(error => `<li>${error}</li>`).join('')}
                </ul>
              </div>
            `;
          } else {
            contenedorErrores.innerHTML = '';
          }
        }
      }

      // VALIDACIÓN EN TIEMPO REAL
      const inputs = contenedorFormulario.querySelectorAll('input, select');
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          // Obtener valores de todos los campos del formulario
          const nombreInput = contenedorFormulario.querySelector(`#update-nombre-${datos.id}`) as HTMLInputElement;
          const asignacionInput = contenedorFormulario.querySelector(`#update-asignacion-${datos.id}`) as HTMLInputElement;
          const cedulaInput = contenedorFormulario.querySelector(`#update-cedula-${datos.id}`) as HTMLInputElement;
          const fechaNacimientoInput = contenedorFormulario.querySelector(`#update-fechaNacimiento-${datos.id}`) as HTMLInputElement;
          const fechaIngresoInput = contenedorFormulario.querySelector(`#update-fechaDeIngreso-${datos.id}`) as HTMLInputElement;
          const celularInput = contenedorFormulario.querySelector(`#update-celular-${datos.id}`) as HTMLInputElement;
          const correoInput = contenedorFormulario.querySelector(`#update-correo-${datos.id}`) as HTMLInputElement;
          const estadoInput = contenedorFormulario.querySelector(`#update-estado-${datos.id}`) as HTMLSelectElement;
          
          // Validar solo si todos los elementos existen
          if (nombreInput && asignacionInput && cedulaInput && fechaNacimientoInput && 
              fechaIngresoInput && celularInput && correoInput && estadoInput) {
            
            const validacion = validarDatosFormulario(
              nombreInput.value,
              asignacionInput.value,
              cedulaInput.value,
              fechaNacimientoInput.value,
              fechaIngresoInput.value,
              celularInput.value,
              correoInput.value,
              estadoInput.value
            );
            
            mostrarErroresValidacion(validacion.errores);
          }
        });
      });

      console.log('Formulario de actualización creado exitosamente');
    }

    function formatearFechaParaInput(fecha: string | Date | number[]): string {
      if (!fecha) return '';
      
      try {
        // ✅ SI ES ARRAY: [año, mes, día]
        if (Array.isArray(fecha) && fecha.length === 3) {
          const [año, mes, dia] = fecha;
          return `${año}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
        }
        
        // Si es string, intentar parsearlo
        if (typeof fecha === 'string') {
          // FORMATO CON PUNTOS: 2004.7.14
          if (fecha.includes('.')) {
            const partes = fecha.split('.');
            if (partes.length === 3) {
              const año = partes[0];
              const mes = partes[1].padStart(2, '0');
              const dia = partes[2].padStart(2, '0');
              return `${año}-${mes}-${dia}`;
            }
          }
          // Si viene como DD/MM/YYYY
          else if (fecha.includes('/')) {
            const [dia, mes, año] = fecha.split('/');
            return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
          // Si viene como YYYY-MM-DD (ya correcto)
          else if (fecha.includes('-') && fecha.length === 10) {
            return fecha;
          }
        }
        // Si es Date
        else if (fecha instanceof Date) {
          return fecha.toISOString().split('T')[0];
        }
        
        console.warn('Formato de fecha no reconocido:', fecha);
        return '';
        
      } catch (error) {
        console.error('Error formateando fecha:', fecha, error);
        return '';
      }
    }

    // Referencia al formulario container
    const formContainer = document.getElementById('formContainer');

    // Función para descargar archivos
    function descargarArchivo(employeeId: number, tipo: 'eps' | 'studies') {
      // Construir URL según tu controlador
      const endpoint = tipo === 'eps' ? 'eps' : 'studies';
      const url = `${apiUrlArchivos}/${employeeId}/${endpoint}`;
      
      console.log('Descargando archivo desde:', url);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      
      // Agregar target blank para forzar descarga en algunos navegadores
      link.target = '_blank';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Hacer la función accesible globalmente
    (window as any).descargarArchivo = descargarArchivo;

    // Función para manejar envío del formulario principal de empleados
    function manejarEnvioFormularioEmpleado(event: Event) {
      event.preventDefault();
      console.log('Formulario de empleado enviado');
    
      // Obtener elementos del formulario de empleados
      const nombreInput = document.getElementById('nombre') as HTMLInputElement;
      const asignacionInput = document.getElementById('asignacion') as HTMLInputElement;
      const cedulaInput = document.getElementById('cedula') as HTMLInputElement;
      const fechaNacimientoInput = document.getElementById('fechaNacimiento') as HTMLInputElement;
      const fechaIngresoInput = document.getElementById('fechaDeIngreso') as HTMLInputElement;
      const celularInput = document.getElementById('celular') as HTMLInputElement;
      const correoInput = document.getElementById('correo') as HTMLInputElement;
      const estadoInput = document.getElementById('estado') as HTMLSelectElement;
      const epsArchivoInput = document.getElementById('epsArchivo') as HTMLInputElement;
      const estudiosArchivoInput = document.getElementById('estudiosArchivo') as HTMLInputElement;

      // Validar que todos los elementos existen
      if (!nombreInput || !asignacionInput || !cedulaInput || !fechaNacimientoInput || 
          !fechaIngresoInput || !celularInput || !correoInput || !estadoInput) {
        mostrarNotificacion('Error: No se pudieron obtener todos los campos del formulario', 'error');
        return;
      }

      // Validar datos del formulario
      const validacion = validarDatosFormulario(
        nombreInput.value,
        asignacionInput.value,
        cedulaInput.value,
        fechaNacimientoInput.value,
        fechaIngresoInput.value,
        celularInput.value,
        correoInput.value,
        estadoInput.value
      );

      if (!validacion.valido) {
        mostrarErroresFormularioEmpleado(validacion.errores);
        return;
      }

      // Deshabilitar botón de envío
      const submitBtn = document.querySelector('#empleadoForm button[type="submit"]') as HTMLButtonElement;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Guardando...';
      }

      // Obtener archivos
      const epsFile = epsArchivoInput?.files?.[0];
      const estudiosFile = estudiosArchivoInput?.files?.[0];
      
      // Crear datos del empleado (SIN archivos, solo referencias de nombres)
      const empleadoData = {
        idUsuario: 1,
        nombre: nombreInput.value.trim(),
        asignacion: asignacionInput.value.trim(),
        cedula: cedulaInput.value.trim(),
        fechaNacimiento: fechaNacimientoInput.value,
        fechaDeIngreso: fechaIngresoInput.value,
        celular: celularInput.value.trim(),
        correo: correoInput.value.trim(),
        estado: estadoInput.value,
        // Guardar nombres de archivos para referencia (opcional, según tu backend)
        epsArchivo: epsFile ? epsFile.name : '',
        estudiosArchivo: estudiosFile ? estudiosFile.name : ''
      };
      
      console.log('Intentando crear empleado en:', apiUrl);
      console.log('Datos del empleado:', empleadoData);
    
      // Crear el empleado primero (sin archivos)
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(empleadoData)
      })
      .then(async response => {
        console.log('Respuesta de creación de empleado:', response);
        console.log('Status:', response.status);
        console.log('StatusText:', response.statusText);
        
        if (!response.ok) {
          // ✅ SIEMPRE INTENTAR PARSEAR COMO JSON PRIMERO
          let errorData;
          
          try {
            // El backend SIEMPRE envía JSON, así que parseamos directamente
            errorData = await response.json();
            console.log('Error parseado como JSON:', errorData);
          } catch (parseError) {
            console.log('No se pudo parsear como JSON, obteniendo texto:', parseError);
            // Solo si falla el JSON, obtener como texto
            const text = await response.text();
            errorData = { 
              message: text || 'Error desconocido', 
              error: 'error_servidor',
              status: response.status
            };
            console.log('Error creado manualmente:', errorData);
          }
          
          // ✅ LANZAR EL OBJETO DIRECTAMENTE
          throw errorData;
        }
        
        // Si todo está bien, parsear la respuesta exitosa
        return response.json();
      })
      .then(async (empleadoCreado) => {
        console.log('Empleado creado exitosamente:', empleadoCreado);
        
        // PASO 2: Subir archivos usando el ID del empleado recién creado
        if (epsFile || estudiosFile) {
          try {
            console.log(`Subiendo archivos para empleado ID: ${empleadoCreado.id}`);
            
            // Actualizar el texto del botón para mostrar progreso
            if (submitBtn) {
              submitBtn.innerText = 'Subiendo archivos...';
            }
            
            await subirArchivosEmpleado(empleadoCreado.id, epsFile, estudiosFile);
            console.log('Archivos subidos exitosamente');
            
          } catch (archivoError) {
            console.error('Error al subir archivos:', archivoError);
            // Empleado creado pero archivos fallaron 
            const mensajeError = analizarErrorBackend(archivoError);
            
            mostrarNotificacion(`Empleado creado exitosamente, pero hubo un error al subir los archivos: ${mensajeError}`, 'error');
            
            // Aún así, limpiar el formulario y recargar datos
            resetearFormularioEmpleado();
            ocultarFormularioEmpleado();
            obtenerEmpleados();
            return;
          }
        }
        
        // ÉXITO COMPLETO: Empleado creado y archivos subidos
        resetearFormularioEmpleado();
        ocultarFormularioEmpleado();
        obtenerEmpleados();
        mostrarNotificacion('Empleado guardado con éxito', 'success');
      })
      .catch(errorResponse => {
        console.error('Error capturado en creación:', errorResponse);
        console.error('Tipo de error:', typeof errorResponse);
        console.error('¿Es objeto?', typeof errorResponse === 'object');
        
        // ✅ VERIFICAR SI ES ERROR DE CONEXIÓN
        if (errorResponse instanceof TypeError && errorResponse.message?.includes('Failed to fetch')) {
          mostrarNotificacion('No se pudo conectar al servidor. Verifica que esté funcionando en ' + apiUrl, 'error');
        } else if (typeof errorResponse === 'string' && errorResponse.includes('Failed to fetch')) {
          mostrarNotificacion('No se pudo conectar al servidor. Verifica que esté funcionando en ' + apiUrl, 'error');
        } else {
          // ✅ USAR analizarErrorBackend CON EL OBJETO COMPLETO
          const mensajeError = analizarErrorBackend(errorResponse);
          mostrarNotificacion(mensajeError, 'error');
        }
      })
      .finally(() => {
        // Rehabilitar botón sin importar el resultado
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Guardar Empleado';
        }
      });
    }

    // Función para mostrar errores en el formulario principal de empleados
    function mostrarErroresFormularioEmpleado(errores: string[]) {
      // Remover errores anteriores
      const erroresAnteriores = document.querySelectorAll('.error-validacion-empleado');
      erroresAnteriores.forEach(error => error.remove());

      if (errores.length > 0) {
        const form = document.getElementById('empleadoForm');
        if (form) {
          const contenedorErrores = document.createElement('div');
          contenedorErrores.className = 'error-validacion-empleado';
          contenedorErrores.style.cssText = `
            background-color: #ffebee;
            border: 1px solid #ffcdd2;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
            color: #c62828;
          `;
          
          contenedorErrores.innerHTML = `
            <strong>Errores de validación:</strong>
            <ul style="margin: 5px 0 0 20px;">
              ${errores.map(error => `<li>${error}</li>`).join('')}
            </ul>
          `;
          
          form.insertBefore(contenedorErrores, form.firstChild);
        }
      }
    }

    // Función para resetear el formulario de empleados
    function resetearFormularioEmpleado() {
      const form = document.getElementById('empleadoForm') as HTMLFormElement;
      if (form) {
        form.reset();
        // Remover errores de validación
        const errores = form.querySelectorAll('.error-validacion-empleado');
        errores.forEach(error => error.remove());
      }
    }

    // Función para ocultar el formulario de empleados
    function ocultarFormularioEmpleado() {
      const formContainer = document.getElementById('formContainer');
      if (formContainer) {
        formContainer.style.display = 'none';
      }
    }

    // Función para mostrar el formulario de empleados
    function mostrarFormularioEmpleado() {
      const formContainer = document.getElementById('formContainer');
      if (formContainer) {
        formContainer.style.display = 'block';
      }
    }

    // Función para mostrar notificaciones
    function mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') {
      // Crear elemento de notificación
      const notificacion = document.createElement('div');
      notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 6px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease-in-out;
      `;

      // Establecer colores según el tipo
      switch (tipo) {
        case 'success':
          notificacion.style.backgroundColor = '#4CAF50';
          break;
        case 'error':
          notificacion.style.backgroundColor = '#FF6B6B';
          break;
        case 'info':
        default:
          notificacion.style.backgroundColor = '#2196F3';
          break;
      }

      notificacion.textContent = mensaje;
      document.body.appendChild(notificacion);

      // Animar entrada
      setTimeout(() => {
        notificacion.style.transform = 'translateX(0)';
      }, 100);

      // Auto-remover después de 5 segundos
      setTimeout(() => {
        notificacion.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notificacion)) {
            document.body.removeChild(notificacion);
          }
        }, 300);
      }, 5000);

      // Permitir cerrar haciendo clic
      notificacion.addEventListener('click', () => {
        notificacion.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notificacion)) {
            document.body.removeChild(notificacion);
          }
        }, 300);
      });
    }

    // Event listeners para botones del formulario
    const btnMostrarFormulario = document.getElementById('btnMostrarFormulario');
    if (btnMostrarFormulario) {
      btnMostrarFormulario.addEventListener('click', mostrarFormularioEmpleado);
    }

    const btnOcultarFormulario = document.getElementById('btnOcultarFormulario');
    if (btnOcultarFormulario) {
      btnOcultarFormulario.addEventListener('click', ocultarFormularioEmpleado);
    }

    // Event listener para el formulario de empleados
    const empleadoForm = document.getElementById('empleadoForm');
    if (empleadoForm) {
      empleadoForm.addEventListener('submit', manejarEnvioFormularioEmpleado);
    }

    // Validación en tiempo real para el formulario principal de empleados
    function configurarValidacionTiempoRealEmpleados() {
      const nombreInput = document.getElementById('nombre') as HTMLInputElement;
      const asignacionInput = document.getElementById('asignacion') as HTMLInputElement;
      const cedulaInput = document.getElementById('cedula') as HTMLInputElement;
      const fechaNacimientoInput = document.getElementById('fechaNacimiento') as HTMLInputElement;
      const fechaIngresoInput = document.getElementById('fechaDeIngreso') as HTMLInputElement;
      const celularInput = document.getElementById('celular') as HTMLInputElement;
      const correoInput = document.getElementById('correo') as HTMLInputElement;
      const estadoInput = document.getElementById('estado') as HTMLSelectElement;

      const inputs = [nombreInput, asignacionInput, cedulaInput, fechaNacimientoInput, fechaIngresoInput, celularInput, correoInput, estadoInput].filter(input => input);

      if (inputs.length > 0) {
        inputs.forEach(input => {
          input.addEventListener('input', () => {
            // Remover errores anteriores
            const erroresAnteriores = document.querySelectorAll('.error-validacion-empleado');
            erroresAnteriores.forEach(error => error.remove());

            // Solo validar si hay contenido en todos los campos requeridos
            if (nombreInput?.value.trim() && asignacionInput?.value.trim() && 
                cedulaInput?.value.trim() && fechaNacimientoInput?.value.trim() &&
                fechaIngresoInput?.value.trim() && celularInput?.value.trim() &&
                correoInput?.value.trim() && estadoInput?.value.trim()) {
              
              const validacion = validarDatosFormulario(
                nombreInput.value,
                asignacionInput.value,
                cedulaInput.value,
                fechaNacimientoInput.value,
                fechaIngresoInput.value,
                celularInput.value,
                correoInput.value,
                estadoInput.value
              );

              if (!validacion.valido) {
                mostrarErroresFormularioEmpleado(validacion.errores);
              }
            }
          });
        });

        // Agregar contadores de caracteres para empleados
        agregarContadoresCaracteresEmpleados();
      }
    }

    // Función para agregar contadores de caracteres específicos para empleados
    function agregarContadoresCaracteresEmpleados() {
      const campos = [
        { id: 'nombre', max: 50 },
        { id: 'asignacion', max: 50 },
        { id: 'cedula', max: 10 },
        { id: 'celular', max: 10 },
        { id: 'correo', max: 100 }
      ];

      campos.forEach(campo => {
        const input = document.getElementById(campo.id) as HTMLInputElement;
        if (input) {
          // Verificar si ya existe un contador
          const contadorExistente = input.parentNode?.querySelector('.contador-caracteres');
          if (contadorExistente) {
            return; // Ya existe un contador, no crear otro
          }

          // Crear contador
          const contador = document.createElement('small');
          contador.className = 'contador-caracteres';
          contador.style.cssText = 'color: #666; float: right; margin-top: 5px; font-size: 12px;';
          contador.textContent = `0/${campo.max}`;

          // Insertar después del input
          if (input.parentNode) {
            input.parentNode.insertBefore(contador, input.nextSibling);
          }

          // Actualizar contador
          const actualizarContador = () => {
            const longitud = input.value.length;
            contador.textContent = `${longitud}/${campo.max}`;
            
            if (longitud > campo.max * 0.9) {
              contador.style.color = '#ff9800'; // Naranja cuando se acerca al límite
            } else if (longitud >= campo.max) {
              contador.style.color = '#f44336'; // Rojo cuando excede el límite
            } else {
              contador.style.color = '#666'; // Gris normal
            }
          };

          input.addEventListener('input', actualizarContador);
          actualizarContador(); // Inicializar
        }
      });
    }

    // Función para verificar conexión con el servidor ERA HEAD, LO CAMBIE A GET PORQUE ERA OTRA OPCION, YA VEREMOS.
    function verificarConexionServidor() {
      fetch(apiUrl, { method: 'GET' })
        .then(response => {
          if (response.ok) {
            console.log('Conexión con el servidor establecida');
          } else {
            console.warn('El servidor respondió pero con estado:', response.status);
          }
        })
        .catch(error => {
          console.error('No se pudo conectar al servidor:', error);
          mostrarNotificacion('No se pudo conectar al servidor. Verifica que esté funcionando.', 'error');
        });
    }

    // Función para configurar todos los event listeners
    function configurarEventListeners() {
      // Event listeners para botones del formulario de empleados
      const btnMostrarFormulario = document.getElementById('btnMostrarFormulario');
      if (btnMostrarFormulario) {
        btnMostrarFormulario.addEventListener('click', mostrarFormularioEmpleado);
        console.log('Event listener para mostrar formulario configurado');
      }

      const btnOcultarFormulario = document.getElementById('btnOcultarFormulario');
      if (btnOcultarFormulario) {
        btnOcultarFormulario.addEventListener('click', ocultarFormularioEmpleado);
        console.log('Event listener para ocultar formulario configurado');
      }

      // Event listener para el formulario de empleados
      const empleadoForm = document.getElementById('empleadoForm');
      if (empleadoForm) {
        empleadoForm.addEventListener('submit', manejarEnvioFormularioEmpleado);
        console.log('Event listener de submit para empleados configurado');
      } else {
        console.error('No se encontró el formulario de empleados');
      }

      // Configurar botón toggle para mostrar/ocultar formulario (si existe)
      const addBtn = document.getElementById('addBtn');
      if (addBtn && formContainer) {
        // Por defecto, ocultar el formulario
        formContainer.style.display = 'none';
        
        addBtn.addEventListener('click', () => {
          const estaVisible = formContainer.style.display !== 'none';
          formContainer.style.display = estaVisible ? 'none' : 'block';
          
          // Si se muestra el formulario, enfocar el primer campo
          if (!estaVisible) {
            setTimeout(() => {
              const primerInput = formContainer.querySelector('input');
              if (primerInput) {
                (primerInput as HTMLInputElement).focus();
              }
            }, 100);
          } else {
            // Si se oculta, resetear el formulario
            resetearFormularioEmpleado();
          }
          
          console.log('Formulario toggle:', formContainer.style.display);
        });
        console.log('Event listener de addBtn configurado');
      }

      // Event listener para botón de cancelar (si existe)
      const cancelBtn = document.getElementById('cancelBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          resetearFormularioEmpleado();
          ocultarFormularioEmpleado();
        });
        console.log('Event listener de cancelar configurado'); 
      }
    }

    // Función para manejar errores globales
    function configurarManejadorErrores() {
      // Manejar errores globales de JavaScript
      window.addEventListener('error', (event) => {
        console.error('Error global capturado:', event.error);
        mostrarNotificacion('Se produjo un error inesperado. Revisa la consola para más detalles.', 'error');
      });

      // Manejar promesas rechazadas no capturadas
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Promesa rechazada no manejada:', event.reason);
        mostrarNotificacion('Error en la aplicación. Revisa la consola para más detalles.', 'error');
        // Prevenir que el error se muestre en la consola del navegador
        event.preventDefault();
      });
    }

    // Función de inicialización principal
    function inicializarAplicacion() {
      console.log('Inicializando aplicación de empleados...');
      
      try {
        obtenerEmpleados();
        
        setTimeout(() => {
          configurarValidacionTiempoRealEmpleados();
        }, 100);
        
        configurarEventListeners();
        
        verificarConexionServidor();
      
        configurarManejadorErrores();
        
        console.log('Aplicación de empleados inicializada correctamente');
        
      } catch (error) {
        console.error('Error durante la inicialización:', error);
        mostrarNotificacion('Error al inicializar la aplicación', 'error');
      }
    }

    // Inicializar la aplicación cuando el DOM esté listo
    inicializarAplicacion();

  }


  buscar() {
    const nombre = (document.getElementById('buscarNombre') as HTMLInputElement).value;
    const cedula = (document.getElementById('buscarCedula') as HTMLInputElement).value;
    const estado = (document.getElementById('buscarEstado') as HTMLSelectElement).value;
    
    let params = new HttpParams();
    
    if (nombre) {
      params = params.set('nombre', nombre);
    }
    
    if (cedula) {
      params = params.set('cedula', cedula);
    }
    
    if (estado) {
      params = params.set('estado', estado);
    }
    
    this.http.get<any[]>(`${environment.apiUrl}/empleados/buscar`, { params }).subscribe({
      next: (data) => {
        this.mostrarResultados(data);
      },
      error: (error) => {
        console.error('Error:', error);
      }
    });
  }

  mostrarResultados(empleados: any[]) {
    const resultadosDiv = document.getElementById('resultados')!;
    
    if (empleados.length === 0) {
      resultadosDiv.innerHTML = '<p>No se encontraron empleados.</p>';
      return;
    }
    
    let html = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 10px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #ddd; padding: 8px;">Nombre</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Cédula</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Estado</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Celular</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    empleados.forEach(emp => {
      html += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${emp.nombre}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${emp.cedula}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${emp.estado}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${emp.celular}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">
            <button onclick="editarEmpleado(${emp.id})" style="background-color: #ffc107; color: black; border: none; padding: 5px 10px; margin-right: 5px; cursor: pointer;">Editar</button>
            <button onclick="eliminarEmpleado(${emp.id})" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; cursor: pointer;">Eliminar</button>
          </td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    resultadosDiv.innerHTML = html;
  }

  editarEmpleado(id: number) {
    console.log('Editar empleado ID:', id);
    
    // Obtener los datos del empleado desde el servidor
    this.http.get<any>(`${environment.apiUrl}/empleados/${id}`).subscribe({
      next: (empleado) => {
        console.log('Datos del empleado obtenidos:', empleado);
        
        // Crear overlay de fondo
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          overflow-y: auto;
          padding: 20px;
          box-sizing: border-box;
        `;
        
        // Crear contenedor del modal
        const modalContainer = document.createElement('div');
        modalContainer.style.cssText = `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 2px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        `;

        // Crear el contenido del modal
        modalContainer.innerHTML = `
          <div style="
            background: white;
            border-radius: 14px;
            padding: 32px;
            position: relative;
            overflow: hidden;
          ">
            <!-- Decoración de fondo -->
            <div style="
              position: absolute;
              top: -50px;
              right: -50px;
              width: 100px;
              height: 100px;
              background: linear-gradient(45deg, #667eea20, #764ba220);
              border-radius: 50%;
            "></div>
            
            <!-- Botón de cerrar -->
            <button id="cerrar-modal-${id}" style="
              position: absolute;
              top: 16px;
              right: 16px;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: #f1f5f9;
              color: #64748b;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              z-index: 10;
            " onmouseover="this.style.background='#e2e8f0'; this.style.color='#334155'" 
              onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b'">
              ✕
            </button>
            
            <!-- Título principal -->
            <div style="text-align: center; margin-bottom: 32px; position: relative;">
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 12px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 50px;
                color: white;
                font-size: 18px;
                font-weight: 600;
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
              ">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Editar Empleado
              </div>
            </div>

            <form id="form-editar-modal-${id}" style="position: relative;">
              <!-- Sección de información personal -->
              <div style="margin-bottom: 28px;">
                <h4 style="
                  color: #4a5568;
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0 0 20px 0;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    width: 8px;
                    height: 8px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    border-radius: 50%;
                  "></div>
                  Información Personal
                </h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                  <!-- Nombre -->
                  <div style="position: relative;">
                    <label for="modal-nombre-${id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Nombre <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="modal-nombre-${id}" 
                      name="nombre" 
                      value="${this.sanitizeText(empleado.nombre)}"
                      maxlength="50"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>

                  <!-- Asignación -->
                  <div style="position: relative;">
                    <label for="modal-asignacion-${id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Asignación <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="modal-asignacion-${id}" 
                      name="asignacion" 
                      value="${this.sanitizeText(empleado.asignacion)}"
                      maxlength="50"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                  <!-- Cédula -->
                  <div style="position: relative;">
                    <label for="modal-cedula-${id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Cédula <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="modal-cedula-${id}" 
                      name="cedula" 
                      value="${this.sanitizeText(empleado.cedula)}"
                      maxlength="10"
                      pattern="[0-9]+"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>

                  <!-- Celular -->
                  <div style="position: relative;">
                    <label for="modal-celular-${id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Celular <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="tel" 
                      id="modal-celular-${id}" 
                      name="celular" 
                      value="${this.sanitizeText(empleado.celular)}"
                      maxlength="10"
                      pattern="[0-9]+"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>
                </div>

                <!-- Correo (campo completo) -->
                <div style="margin-bottom: 20px;">
                  <label for="modal-correo-${id}" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                    font-size: 14px;
                  ">
                    Correo Electrónico <span style="color: #e53e3e; font-size: 16px;">*</span>
                  </label>
                  <input 
                    type="email" 
                    id="modal-correo-${id}" 
                    name="correo" 
                    value="${this.sanitizeText(empleado.correo)}"
                    maxlength="100"
                    required
                    style="
                      width: 100%;
                      padding: 14px 16px;
                      border: 2px solid #e2e8f0;
                      border-radius: 12px;
                      font-size: 14px;
                      background: #fafafa;
                      transition: all 0.3s ease;
                      box-sizing: border-box;
                    "
                    onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                    onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                  />
                </div>
              </div>

              <!-- Sección de fechas -->
              <div style="margin-bottom: 28px;">
                <h4 style="
                  color: #4a5568;
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0 0 20px 0;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    width: 8px;
                    height: 8px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    border-radius: 50%;
                  "></div>
                  Fechas Importantes
                </h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <!-- Fecha de Nacimiento -->
                  <div>
                    <label for="modal-fechaNacimiento-${id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Fecha de Nacimiento <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="date" 
                      id="modal-fechaNacimiento-${id}" 
                      name="fechaNacimiento" 
                      value="${this.formatearFechaParaInput(empleado.fechaNacimiento)}"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>

                  <!-- Fecha de Ingreso -->
                  <div>
                    <label for="modal-fechaDeIngreso-${id}" style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #2d3748;
                      font-size: 14px;
                    ">
                      Fecha de Ingreso <span style="color: #e53e3e; font-size: 16px;">*</span>
                    </label>
                    <input 
                      type="date" 
                      id="modal-fechaDeIngreso-${id}" 
                      name="fechaDeIngreso" 
                      value="${this.formatearFechaParaInput(empleado.fechaDeIngreso)}"
                      required
                      style="
                        width: 100%;
                        padding: 14px 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 14px;
                        background: #fafafa;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                      onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                    />
                  </div>
                </div>
              </div>

              <!-- Sección de estado -->
              <div style="margin-bottom: 28px;">
                <h4 style="
                  color: #4a5568;
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0 0 20px 0;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    width: 8px;
                    height: 8px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    border-radius: 50%;
                  "></div>
                  Estado del Empleado
                </h4>
                
                <div>
                  <label for="modal-estado-${id}" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                    font-size: 14px;
                  ">
                    Estado <span style="color: #e53e3e; font-size: 16px;">*</span>
                  </label>
                  <select 
                    id="modal-estado-${id}" 
                    name="estado" 
                    required
                    style="
                      width: 100%;
                      padding: 14px 16px;
                      border: 2px solid #e2e8f0;
                      border-radius: 12px;
                      font-size: 14px;
                      background: #fafafa;
                      transition: all 0.3s ease;
                      box-sizing: border-box;
                      cursor: pointer;
                    "
                    onfocus="this.style.border='2px solid #667eea'; this.style.background='white'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
                    onblur="this.style.border='2px solid #e2e8f0'; this.style.background='#fafafa'; this.style.boxShadow='none'"
                  >
                    <option value="Activo" ${empleado.estado === 'Activo' ? 'selected' : ''}>✅ Activo</option>
                    <option value="Inactivo" ${empleado.estado === 'Inactivo' ? 'selected' : ''}>⏸️ Inactivo</option>
                    <option value="Suspendido" ${empleado.estado === 'Suspendido' ? 'selected' : ''}>⛔ Suspendido</option>
                  </select>
                </div>
              </div>

              <!-- Sección de archivos actuales -->
              <div style="
                background: linear-gradient(135deg, #e0f2fe, #b3e5fc);
                padding: 20px;
                border-radius: 16px;
                margin-bottom: 20px;
                border: 2px solid #0288d1;
              ">
                <h4 style="
                  color: #01579b;
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0 0 16px 0;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    padding: 6px;
                    background: #0288d1;
                    border-radius: 6px;
                    color: white;
                  ">
                    📁
                  </div>
                  Archivos Actuales
                </h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div style="
                    background: rgba(255, 255, 255, 0.8);
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #0288d1;
                  ">
                    <p style="margin: 0 0 4px 0; font-weight: 600; color: #01579b; font-size: 12px;">📄 EPS ACTUAL:</p>
                    <p style="margin: 0; color: #0277bd; font-size: 13px; word-break: break-all;">
                      ${empleado.epsArchivo || 'Sin archivo'}
                    </p>
                  </div>
                  <div style="
                    background: rgba(255, 255, 255, 0.8);
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #0288d1;
                  ">
                    <p style="margin: 0 0 4px 0; font-weight: 600; color: #01579b; font-size: 12px;">🎓 ESTUDIOS ACTUAL:</p>
                    <p style="margin: 0; color: #0277bd; font-size: 13px; word-break: break-all;">
                      ${empleado.estudiosArchivo || 'Sin archivo'}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Sección de archivos nuevos -->
              <div style="
                background: linear-gradient(135deg, #fef7e0, #fef3c7);
                padding: 24px;
                border-radius: 16px;
                margin-bottom: 28px;
                border: 2px solid #fbbf24;
                position: relative;
                overflow: hidden;
              ">
                <div style="
                  position: absolute;
                  top: -20px;
                  right: -20px;
                  width: 60px;
                  height: 60px;
                  background: rgba(251, 191, 36, 0.1);
                  border-radius: 50%;
                "></div>
                
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 16px;
                  position: relative;
                ">
                  <div style="
                    padding: 8px;
                    background: #fbbf24;
                    border-radius: 8px;
                    color: white;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600;">
                      Actualizar Archivos
                    </h4>
                    <p style="margin: 4px 0 0 0; color: #b45309; font-size: 14px;">
                      Opcional: Deja vacío para mantener los archivos actuales
                    </p>
                  </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div>
                    <label style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #92400e;
                      font-size: 14px;
                    ">
                      📄 Nuevo Archivo EPS:
                    </label>
                    <input 
                      type="file" 
                      name="archivoEPS" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      style="
                        width: 100%;
                        padding: 12px;
                        border: 2px dashed #fbbf24;
                        border-radius: 12px;
                        background: rgba(255, 255, 255, 0.7);
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onmouseover="this.style.background='rgba(255, 255, 255, 1)'; this.style.borderColor='#f59e0b'"
                      onmouseout="this.style.background='rgba(255, 255, 255, 0.7)'; this.style.borderColor='#fbbf24'"
                    />
                  </div>
                  <div>
                    <label style="
                      display: block;
                      margin-bottom: 8px;
                      font-weight: 600;
                      color: #92400e;
                      font-size: 14px;
                    ">
                      🎓 Nuevo Archivo de Estudios:
                    </label>
                    <input 
                      type="file" 
                      name="archivoEstudios" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      style="
                        width: 100%;
                        padding: 12px;
                        border: 2px dashed #fbbf24;
                        border-radius: 12px;
                        background: rgba(255, 255, 255, 0.7);
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                      "
                      onmouseover="this.style.background='rgba(255, 255, 255, 1)'; this.style.borderColor='#f59e0b'"
                      onmouseout="this.style.background='rgba(255, 255, 255, 0.7)'; this.style.borderColor='#fbbf24'"
                    />
                  </div>
                </div>
              </div>

              <!-- Errores de validación -->
              <div id="errores-validacion-modal-${id}" style="margin-bottom: 20px;"></div>
              
              <!-- Botones de acción -->
              <div style="
                display: flex;
                gap: 16px;
                justify-content: flex-end;
                padding-top: 20px;
                border-top: 2px solid #f7fafc;
              ">
                <button 
                  type="button" 
                  id="btn-cancelar-modal-${id}"
                  style="
                    padding: 14px 28px;
                    background: #f7fafc;
                    color: #4a5568;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                  "
                  onmouseover="this.style.background='#edf2f7'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                  onmouseout="this.style.background='#f7fafc'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cancelar
                </button>
                
                <button 
                  type="submit" 
                  id="btn-guardar-modal-${id}"
                  style="
                    padding: 14px 28px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
                  "
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(102, 126, 234, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(102, 126, 234, 0.3)'"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                  </svg>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        `;

        // Añadir modal al overlay
        overlay.appendChild(modalContainer);
        document.body.appendChild(overlay);

        // === EVENT LISTENERS ===

        // Botón de cerrar (X)
        const btnCerrar = modalContainer.querySelector(`#cerrar-modal-${id}`) as HTMLButtonElement;
        if (btnCerrar) {
          btnCerrar.addEventListener('click', () => {
            document.body.removeChild(overlay);
          });
        }

        // Botón de cancelar
        const btnCancelar = modalContainer.querySelector(`#btn-cancelar-modal-${id}`) as HTMLButtonElement;
        if (btnCancelar) {
          btnCancelar.addEventListener('click', () => {
            document.body.removeChild(overlay);
          });
        }

        // Cerrar al hacer clic en el overlay (fondo)
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            document.body.removeChild(overlay);
          }
        });

        // Cerrar con tecla Escape
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
          }
        };
        document.addEventListener('keydown', handleEscape);

        // === FORMULARIO SUBMIT ===
        const formulario = modalContainer.querySelector(`#form-editar-modal-${id}`) as HTMLFormElement;
        const btnGuardar = modalContainer.querySelector(`#btn-guardar-modal-${id}`) as HTMLButtonElement;

        if (formulario) {
          formulario.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('Formulario modal enviado');

            // Obtener elementos del formulario
            const nombreInput = formulario.querySelector(`#modal-nombre-${id}`) as HTMLInputElement;
            const asignacionInput = formulario.querySelector(`#modal-asignacion-${id}`) as HTMLInputElement;
            const cedulaInput = formulario.querySelector(`#modal-cedula-${id}`) as HTMLInputElement;
            const fechaNacimientoInput = formulario.querySelector(`#modal-fechaNacimiento-${id}`) as HTMLInputElement;
            const fechaIngresoInput = formulario.querySelector(`#modal-fechaDeIngreso-${id}`) as HTMLInputElement;
            const celularInput = formulario.querySelector(`#modal-celular-${id}`) as HTMLInputElement;
            const correoInput = formulario.querySelector(`#modal-correo-${id}`) as HTMLInputElement;
            const estadoInput = formulario.querySelector(`#modal-estado-${id}`) as HTMLSelectElement;
            const archivoEPSInput = formulario.querySelector('input[name="archivoEPS"]') as HTMLInputElement;
            const archivoEstudiosInput = formulario.querySelector('input[name="archivoEstudios"]') as HTMLInputElement;

            // Validar que todos los elementos existan
            if (!nombreInput || !asignacionInput || !cedulaInput || !fechaNacimientoInput || 
                !fechaIngresoInput || !celularInput || !correoInput || !estadoInput) {
              this.mostrarNotificacion('Error: No se pudieron obtener todos los campos del formulario', 'error');
              return;
            }

            // Validar datos del formulario usando las funciones globales
            const validacion = (window as any).validarDatosFormulario ? 
              (window as any).validarDatosFormulario(
                nombreInput.value,
                asignacionInput.value,
                cedulaInput.value,
                fechaNacimientoInput.value,
                fechaIngresoInput.value,
                celularInput.value,
                correoInput.value,
                estadoInput.value
              ) : { valido: true, errores: [] };

            if (!validacion.valido) {
              this.mostrarErroresValidacionModal(validacion.errores, id);
              return;
            }

            // Deshabilitar botón durante el envío
            if (btnGuardar) {
              btnGuardar.disabled = true;
              btnGuardar.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                  <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9v-9"/>
                </svg>
                Guardando...
              `;
            }

            try {
              // Actualizar datos básicos del empleado (sin archivos)
              const empleadoData = {
                idUsuario: empleado.idUsuario,
                nombre: nombreInput.value.trim(),
                asignacion: asignacionInput.value.trim(),
                cedula: cedulaInput.value.trim(),
                fechaNacimiento: fechaNacimientoInput.value,
                fechaDeIngreso: fechaIngresoInput.value,
                celular: celularInput.value.trim(),
                correo: correoInput.value.trim(),
                estado: estadoInput.value,
                // Mantener nombres de archivos existentes
                epsArchivo: empleado.epsArchivo,
                estudiosArchivo: empleado.estudiosArchivo
              };

              // Enviar actualización de datos básicos
              const response = await fetch(`${environment.apiUrl}/empleados/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(empleadoData)
              });

              if (!response.ok) {
                let errorData;
                try {
                  errorData = await response.json();
                } catch (parseError) {
                  const text = await response.text();
                  errorData = {
                    message: text || 'Error desconocido',
                    error: 'error_servidor',
                    status: response.status
                  };
                }
                throw errorData;
              }

              const responseData = await response.json();
              console.log("Datos básicos actualizados:", responseData);

              // Actualizar archivos si se seleccionaron nuevos
              const epsFile = archivoEPSInput?.files?.[0];
              const estudiosFile = archivoEstudiosInput?.files?.[0];

              if (epsFile || estudiosFile) {
                try {
                  await this.subirArchivosEmpleado(id, epsFile, estudiosFile);
                  console.log('Archivos actualizados exitosamente');
                } catch (archivoError) {
                  console.error('Error al actualizar archivos:', archivoError);
                  const mensajeError = archivoError instanceof Error 
                    ? archivoError.message 
                    : 'Error desconocido al subir archivos';
                  this.mostrarNotificacion('Datos actualizados pero hubo un error con los archivos: ' + mensajeError, 'error');
                  document.body.removeChild(overlay);
                  return;
                }
              }

              this.mostrarNotificacion('Empleado actualizado exitosamente', 'success');

              // Cerrar el modal
              document.body.removeChild(overlay);

              // Efecto suave antes de recargar
              document.body.style.transition = 'opacity 0.5s ease-in-out';
              document.body.style.opacity = '0.7';

              // Recargar la página con efecto suave
              setTimeout(() => {
                document.body.style.opacity = '0';
                setTimeout(() => {
                  window.location.reload();
                }, 300);
              }, 800); // Un poco más de tiempo para ver la notificación

            } catch (error) {
              console.error('Error al actualizar empleado:', error);
              
              const mensajeError = (window as any).analizarErrorBackend ? 
                (window as any).analizarErrorBackend(error) : 
                'Error al actualizar el empleado';
                
              this.mostrarNotificacion(mensajeError, 'error');
            } finally {
              // Rehabilitar botón
              if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = `
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                  </svg>
                  Guardar Cambios
                `;
              }
            }
          });
        }

        // === VALIDACIÓN EN TIEMPO REAL ===
        const inputs = modalContainer.querySelectorAll('input, select');
        inputs.forEach(input => {
          input.addEventListener('input', () => {
            const nombreInput = modalContainer.querySelector(`#modal-nombre-${id}`) as HTMLInputElement;
            const asignacionInput = modalContainer.querySelector(`#modal-asignacion-${id}`) as HTMLInputElement;
            const cedulaInput = modalContainer.querySelector(`#modal-cedula-${id}`) as HTMLInputElement;
            const fechaNacimientoInput = modalContainer.querySelector(`#modal-fechaNacimiento-${id}`) as HTMLInputElement;
            const fechaIngresoInput = modalContainer.querySelector(`#modal-fechaDeIngreso-${id}`) as HTMLInputElement;
            const celularInput = modalContainer.querySelector(`#modal-celular-${id}`) as HTMLInputElement;
            const correoInput = modalContainer.querySelector(`#modal-correo-${id}`) as HTMLInputElement;
            const estadoInput = modalContainer.querySelector(`#modal-estado-${id}`) as HTMLSelectElement;

            if (nombreInput && asignacionInput && cedulaInput && fechaNacimientoInput && 
                fechaIngresoInput && celularInput && correoInput && estadoInput) {
              
              const validacion = (window as any).validarDatosFormulario ? 
                (window as any).validarDatosFormulario(
                  nombreInput.value,
                  asignacionInput.value,
                  cedulaInput.value,
                  fechaNacimientoInput.value,
                  fechaIngresoInput.value,
                  celularInput.value,
                  correoInput.value,
                  estadoInput.value
                ) : { valido: true, errores: [] };
              
              this.mostrarErroresValidacionModal(validacion.errores, id);
            }
          });
        });

        console.log('Modal de edición creado exitosamente');
      },
      error: (error) => {
        console.error('Error al obtener datos del empleado:', error);
        
        const mensajeError = (window as any).analizarErrorBackend ? 
          (window as any).analizarErrorBackend(error) : 
          'Error al obtener los datos del empleado';
          
        this.mostrarNotificacion(mensajeError, 'error');
      }
    });




    
  }

  // Función auxiliar para mostrar errores de validación en el modal
  private mostrarErroresValidacionModal(errores: string[], employeeId: number) {
    const contenedorErrores = document.querySelector(`#errores-validacion-modal-${employeeId}`);
    if (contenedorErrores) {
      if (errores.length > 0) {
        contenedorErrores.innerHTML = `
          <div style="background-color: #ffebee; border: 1px solid #ffcdd2; border-radius: 8px; padding: 12px;">
            <strong style="color: #c62828; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              Errores de validación:
            </strong>
            <ul style="margin: 8px 0 0 20px; color: #c62828; font-size: 14px;">
              ${errores.map(error => `<li style="margin-bottom: 4px;">${error}</li>`).join('')}
            </ul>
          </div>
        `;
      } else {
        contenedorErrores.innerHTML = '';
      }
    }
  }

  // Función auxiliar para formatear fechas (reutilizada del código original)
  private formatearFechaParaInput(fecha: string | Date | number[]): string {
    if (!fecha) return '';
    
    try {
      // Si es array: [año, mes, día]
      if (Array.isArray(fecha) && fecha.length === 3) {
        const [año, mes, dia] = fecha;
        return `${año}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
      }
      
      // Si es string
      if (typeof fecha === 'string') {
        // FORMATO CON PUNTOS: 2004.7.14
        if (fecha.includes('.')) {
          const partes = fecha.split('.');
          if (partes.length === 3) {
            const año = partes[0];
            const mes = partes[1].padStart(2, '0');
            const dia = partes[2].padStart(2, '0');
            return `${año}-${mes}-${dia}`;
          }
        }
        // Si viene como DD/MM/YYYY
        else if (fecha.includes('/')) {
          const [dia, mes, año] = fecha.split('/');
          return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        // Si viene como YYYY-MM-DD (ya correcto)
        else if (fecha.includes('-') && fecha.length === 10) {
          return fecha;
        }
      }
      // Si es Date
      else if (fecha instanceof Date) {
        return fecha.toISOString().split('T')[0];
      }
      
      console.warn('Formato de fecha no reconocido:', fecha);
      return '';
      
    } catch (error) {
      console.error('Error formateando fecha:', fecha, error);
      return '';
    }
  }

  // Función auxiliar para subir archivos (reutilizada del código original)
  private async subirArchivosEmpleado(employeeId: number, epsFile?: File, estudiosFile?: File): Promise<void> {
    const apiUrlArchivos = `${environment.apiUrl}/archivos`;
    
    try {
      if (epsFile) {
        const formDataEPS = new FormData();
        formDataEPS.append('file', epsFile);
        
        const responseEPS = await fetch(`${apiUrlArchivos}/${employeeId}/eps`, {
          method: 'POST',
          body: formDataEPS
        });
        
        if (!responseEPS.ok) {
          throw new Error(`Error al subir archivo EPS: ${responseEPS.status}`);
        }
      }
      
      if (estudiosFile) {
        const formDataEstudios = new FormData();
        formDataEstudios.append('file', estudiosFile);
        
        const responseEstudios = await fetch(`${apiUrlArchivos}/${employeeId}/studies`, {
          method: 'POST',
          body: formDataEstudios
        });
        
        if (!responseEstudios.ok) {
          throw new Error(`Error al subir archivo de estudios: ${responseEstudios.status}`);
        }
      }
    } catch (error) {
      console.error('Error al subir archivos:', error);
      throw error;
    }
  }

  eliminarEmpleado(id: number) {
    console.log('Eliminar empleado ID:', id);
    
    // Primero obtener los datos del empleado para mostrar su nombre
    this.http.get<any>(`${environment.apiUrl}/empleados/${id}`).subscribe({
      next: async (empleado) => {
        // Usar la misma función de confirmación que ya tienes
        const confirmado = await this.mostrarConfirmacion(
          `¿Estás seguro de que deseas eliminar al trabajador "${empleado.nombre}"? Esta acción no se puede deshacer. Recomendamos simplemente cambiar el estado de Activo a Inactivo, en caso de que no se quiera eliminar permanentemente.`
        );
        
        if (confirmado) {
          // Proceder con la eliminación usando la misma lógica
          this.http.delete(`${environment.apiUrl}/empleados/${id}`).subscribe({
            next: (response) => {
              console.log('Empleado eliminado:', response);
              this.mostrarNotificacion('Empleado eliminado exitosamente', 'success');
              
              // Actualizar la vista de búsqueda si hay resultados
              this.buscar();
              
              // También actualizar la lista principal si está visible
              const listaEmpleados = document.getElementById("lista-empleados");
              if (listaEmpleados && listaEmpleados.innerHTML.trim() !== '') {
                // Si la lista principal tiene contenido, actualizarla también
                (window as any).obtenerEmpleados?.();
              }
            },
            error: (error) => {
              console.error('Error en la eliminación:', error);
              
              const mensajeError = (window as any).analizarErrorBackend ? 
                (window as any).analizarErrorBackend(error) : 
                'Error al eliminar el empleado';
                
              this.mostrarNotificacion(mensajeError, 'error');
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al obtener datos del empleado:', error);
        this.mostrarNotificacion('Error al obtener los datos del empleado', 'error');
      }
    });
  }

  // Función auxiliar para sanitizar texto (si no la tienes ya)
  private sanitizeText(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Función auxiliar para mostrar confirmación (si no la tienes ya como método)
  private mostrarConfirmacion(mensaje: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Usar la misma lógica de confirmación que ya tienes en obtenerEmpleados
      // O crear una nueva si prefieres
      
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        text-align: center;
      `;

      modal.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">Confirmar acción</h3>
        <p style="color: #666; margin: 20px 0;">${mensaje}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="cancelar-modal" style="
            padding: 10px 20px;
            background-color: #ccc;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            color: #333;
          ">Cancelar</button>
          <button id="confirmar-modal" style="
            padding: 10px 20px;
            background-color: #FF6B6B;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Confirmar</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      modal.querySelector('#cancelar-modal')?.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(false);
      });

      modal.querySelector('#confirmar-modal')?.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(true);
      });
    });
  }

  // Función auxiliar para mostrar notificaciones (si no la tienes ya)
  private mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') {
    // Usar la misma función de notificaciones que ya tienes
    // O crear una nueva si prefieres
    
    const notificacion = document.createElement('div');
    notificacion.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 6px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    `;

    switch (tipo) {
      case 'success':
        notificacion.style.backgroundColor = '#4CAF50';
        break;
      case 'error':
        notificacion.style.backgroundColor = '#FF6B6B';
        break;
      case 'info':
      default:
        notificacion.style.backgroundColor = '#2196F3';
        break;
    }

    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);

    setTimeout(() => {
      notificacion.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
      notificacion.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notificacion)) {
          document.body.removeChild(notificacion);
        }
      }, 300);
    }, 5000);
  }

  limpiar() {
    (document.getElementById('buscarNombre') as HTMLInputElement).value = '';
    (document.getElementById('buscarCedula') as HTMLInputElement).value = '';
    (document.getElementById('buscarEstado') as HTMLSelectElement).value = '';
    
    const resultadosDiv = document.getElementById('resultados')!;
    resultadosDiv.innerHTML = '';
  }
}
