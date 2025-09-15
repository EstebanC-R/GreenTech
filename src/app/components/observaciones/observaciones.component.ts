import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-observaciones',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './observaciones.component.html',
  styleUrls: ['./observaciones.component.css']
})
export class ObservacionesComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    const apiUrl = 'http://localhost:8080/api/observaciones';

    interface Observation {
      id: number;
      titulo: string;
      nombre: string;
      descripcion: string;
      fecha_publicacion: string;
    }

    // Función para sanitizar texto (prevenir XSS)
    function sanitizeText(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Función para validar datos del formulario
    function validarDatosFormulario(titulo: string, nombre: string, descripcion: string): { valido: boolean, errores: string[] } {
      const errores: string[] = [];

      // Validar título
      if (!titulo.trim()) {
        errores.push('El título es obligatorio');
      } else if (titulo.trim().length < 3) {
        errores.push('El título debe tener al menos 3 caracteres');
      } else if (titulo.trim().length > 100) {
        errores.push('El título no puede exceder 100 caracteres');
      }

      // Validar nombre
      if (!nombre.trim()) {
        errores.push('El nombre es obligatorio');
      } else if (nombre.trim().length < 2) {
        errores.push('El nombre debe tener al menos 2 caracteres');
      } else if (nombre.trim().length > 50) {
        errores.push('El nombre no puede exceder 50 caracteres');
      }

      // Validar descripción
      if (!descripcion.trim()) {
        errores.push('La descripción es obligatoria');
      } else if (descripcion.trim().length < 10) {
        errores.push('La descripción debe tener al menos 10 caracteres');
      } else if (descripcion.trim().length > 500) {
        errores.push('La descripción no puede exceder 500 caracteres');
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
    
    function obtenerObservaciones() {

      // AGREGAR ESTAS LÍNEAS AL INICIO
      const token = localStorage.getItem('token');
      if (!token) {
        mostrarNotificacion('No hay sesión activa. Redirigiendo al login...', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      // Mostrar indicador de carga
      const listaObservaciones = document.getElementById('lista-observaciones');
      if (listaObservaciones) {
        listaObservaciones.innerHTML = '<p style="text-align: center; padding: 20px;">Cargando observaciones...</p>';
      }

      fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Error del servidor: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .then((data: Observation[]) => {
          if (listaObservaciones) {
            // Limpiar el contenedor
            listaObservaciones.innerHTML = '';
            
            // Configurar estilos del contenedor
            listaObservaciones.style.backgroundColor = 'transparent';
            listaObservaciones.style.boxShadow = 'none';
            listaObservaciones.style.width = '100%';

            if (data.length === 0) {
              listaObservaciones.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No hay observaciones disponibles</p>';
              return;
            }

            data.forEach((datos: Observation) => {
              // Crear una nueva tarjeta para cada observación
              const nuevaTarjeta = document.createElement('div');
              nuevaTarjeta.className = 'card blue-cake';
              
              // ESTILOS MEJORADOS PARA LA TARJETA
              nuevaTarjeta.style.cssText = `
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
                border-radius: 16px;
                padding: 32px;
                width: 60%;
                min-width: 320px;
                margin: 0 auto 24px auto;
                text-align: left;
                border: 1px solid rgba(226, 232, 240, 0.8);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
              `;

              // Agregar efecto hover a la tarjeta
              nuevaTarjeta.addEventListener('mouseenter', () => {
                nuevaTarjeta.style.transform = 'translateY(-4px)';
                nuevaTarjeta.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)';
              });

              nuevaTarjeta.addEventListener('mouseleave', () => {
                nuevaTarjeta.style.transform = 'translateY(0)';
                nuevaTarjeta.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)';
              });

              // Crear contenedor principal del contenido
              const contenidoContainer = document.createElement('div');
              contenidoContainer.style.cssText = `
                margin-bottom: 24px;
              `;

              // TÍTULO con estilo mejorado
              const tituloContainer = document.createElement('div');
              tituloContainer.style.cssText = `
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 2px solid #e2e8f0;
              `;
              
              const tituloLabel = document.createElement('span');
              tituloLabel.textContent = 'Título';
              tituloLabel.style.cssText = `
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: 8px;
              `;
              
              const tituloValor = document.createElement('h3');
              tituloValor.textContent = sanitizeText(datos.titulo);
              tituloValor.style.cssText = `
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                color: #1e293b;
                line-height: 1.3;
              `;
              
              tituloContainer.appendChild(tituloLabel);
              tituloContainer.appendChild(tituloValor);

              // NOMBRE con estilo mejorado
              const nombreContainer = document.createElement('div');
              nombreContainer.style.cssText = `
                display: flex;
                align-items: center;
                margin-bottom: 18px;
              `;
              
              const nombreIcon = document.createElement('div');
              nombreIcon.innerHTML = '👤';
              nombreIcon.style.cssText = `
                font-size: 18px;
                margin-right: 12px;
                background: #f1f5f9;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
              `;
              
              const nombreTexto = document.createElement('div');
              
              const nombreLabel = document.createElement('span');
              nombreLabel.textContent = 'Autor';
              nombreLabel.style.cssText = `
                display: block;
                font-size: 11px;
                font-weight: 500;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              `;
              
              const nombreValor = document.createElement('span');
              nombreValor.textContent = sanitizeText(datos.nombre);
              nombreValor.style.cssText = `
                display: block;
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                margin-top: 2px;
              `;
              
              nombreTexto.appendChild(nombreLabel);
              nombreTexto.appendChild(nombreValor);
              nombreContainer.appendChild(nombreIcon);
              nombreContainer.appendChild(nombreTexto);

              // DESCRIPCIÓN con estilo mejorado
              const descripcionContainer = document.createElement('div');
              descripcionContainer.style.cssText = `
                margin-bottom: 20px;
              `;
              
              const descripcionLabel = document.createElement('span');
              descripcionLabel.textContent = 'Descripción';
              descripcionLabel.style.cssText = `
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: 10px;
              `;
              
              const descripcionValor = document.createElement('p');
              descripcionValor.textContent = sanitizeText(datos.descripcion);
              descripcionValor.style.cssText = `
                margin: 0;
                font-size: 15px;
                line-height: 1.6;
                color: #475569;
                text-align: justify;
                font-weight: 400;
              `;
              
              descripcionContainer.appendChild(descripcionLabel);
              descripcionContainer.appendChild(descripcionValor);

              // FECHA con estilo mejorado
              const fechaContainer = document.createElement('div');
              fechaContainer.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px 16px;
                background: #f8fafc;
                border-radius: 10px;
                border-left: 4px solid #3b82f6;
                margin-bottom: 24px;
              `;
              
              const fechaIcon = document.createElement('span');
              fechaIcon.innerHTML = '📅';
              fechaIcon.style.cssText = `
                font-size: 16px;
                margin-right: 10px;
              `;
              
              const fechaTexto = document.createElement('div');
              
              const fechaLabel = document.createElement('span');
              fechaLabel.textContent = 'Fecha de publicación';
              fechaLabel.style.cssText = `
                display: block;
                font-size: 11px;
                font-weight: 500;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              `;
              
              const fechaValor = document.createElement('span');
              fechaValor.textContent = sanitizeText(datos.fecha_publicacion);
              fechaValor.style.cssText = `
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
                margin-top: 2px;
              `;
              
              fechaTexto.appendChild(fechaLabel);
              fechaTexto.appendChild(fechaValor);
              fechaContainer.appendChild(fechaIcon);
              fechaContainer.appendChild(fechaTexto);

              // Agregar todos los elementos al contenedor de contenido
              contenidoContainer.appendChild(tituloContainer);
              contenidoContainer.appendChild(nombreContainer);
              contenidoContainer.appendChild(descripcionContainer);
              contenidoContainer.appendChild(fechaContainer);

              // Agregar contenido a la tarjeta
              nuevaTarjeta.appendChild(contenidoContainer);

              // BOTONES con estilo mejorado
              const botonesContainer = document.createElement('div');
              botonesContainer.style.cssText = `
                display: flex;
                gap: 12px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
              `;

              // Botón de actualizar mejorado
              const botonActualizar = document.createElement('button');
              botonActualizar.innerHTML = 'Actualizar';
              botonActualizar.className = 'btn-update';
              botonActualizar.style.cssText = `
                flex: 1;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 12px 18px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
              `;

              botonActualizar.addEventListener('mouseenter', () => {
                botonActualizar.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                botonActualizar.style.transform = 'translateY(-1px)';
                botonActualizar.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
              });

              botonActualizar.addEventListener('mouseleave', () => {
                botonActualizar.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                botonActualizar.style.transform = 'translateY(0)';
                botonActualizar.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
              });

              botonActualizar.addEventListener('click', () => {
                mostrarFormularioActualizacion(datos, nuevaTarjeta);
              });

              // Botón de eliminar mejorado
              const botonEliminar = document.createElement('button');
              botonEliminar.innerHTML = 'Eliminar';
              botonEliminar.className = 'btn-delete';
              botonEliminar.style.cssText = `
                flex: 1;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 12px 18px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
              `;

              botonEliminar.addEventListener('mouseenter', () => {
                botonEliminar.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
                botonEliminar.style.transform = 'translateY(-1px)';
                botonEliminar.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
              });

              botonEliminar.addEventListener('mouseleave', () => {
                botonEliminar.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                botonEliminar.style.transform = 'translateY(0)';
                botonEliminar.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
              });
              
              // Event listener para eliminar (mantén tu lógica existente)
              botonEliminar.addEventListener('click', async () => {
                const confirmado = await mostrarConfirmacion(
                  `¿Estás seguro de que deseas eliminar la observación "${datos.titulo}"? Esta acción no se puede deshacer.`
                );
                
                if (confirmado) {
                  botonEliminar.disabled = true;
                  botonEliminar.innerHTML = '⏳ Eliminando...';
                  
                  const token = localStorage.getItem('token');
                  fetch(`${apiUrl}/${datos.id}`, { method: 'DELETE', headers: {'Authorization': `Bearer ${token}`}})
                  .then(response => {
                    if (!response.ok) {
                      throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
                    }
                    mostrarNotificacion('Observación eliminada exitosamente', 'success');
                    nuevaTarjeta.remove();
                  })
                  .catch(error => {
                    console.error('Error en la eliminación:', error);
                    mostrarNotificacion('Error al eliminar la observación: ' + error.message, 'error');
                    botonEliminar.disabled = false;
                    botonEliminar.innerHTML = '🗑️ Eliminar';
                  });
                }
              });

              // Agregar botones al contenedor
              botonesContainer.appendChild(botonActualizar);
              botonesContainer.appendChild(botonEliminar);

              // Agregar contenedor de botones a la tarjeta
              nuevaTarjeta.appendChild(botonesContainer);

              // Agregar la tarjeta al contenedor
              listaObservaciones.appendChild(nuevaTarjeta);
            });
          }
        })
        .catch(error => {
          console.error('Error al obtener observaciones:', error);
          if (listaObservaciones) {
            listaObservaciones.innerHTML = `
              <p style="text-align: center; padding: 20px; color: #FF6B6B;">
                Error al cargar las observaciones: ${error.message}
              </p>
            `;
          }
          mostrarNotificacion('Error al cargar las observaciones', 'error');
        });
    }
    
    // Función para mostrar el formulario de actualización (MEJORADA)
    function mostrarFormularioActualizacion(datos: Observation, tarjeta: HTMLElement) {
      // Verificar si ya hay un formulario abierto
      const formularioExistente = tarjeta.querySelector('form');
      if (formularioExistente) {
        mostrarNotificacion('Ya hay un formulario de edición abierto', 'error');
        return;
      }

      // Crear el formulario
      const formulario = document.createElement('form');
      formulario.style.marginTop = '20px';
      formulario.style.padding = '15px';
      formulario.style.backgroundColor = '#f9f9f9';
      formulario.style.borderRadius = '5px';
      formulario.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';

      // Crear campos del formulario
      formulario.innerHTML = `
        <div style="margin-bottom: 15px;">
          <label for="titulo-edit" style="display: block; margin-bottom: 5px; font-weight: bold;">Título:</label>
          <input type="text" id="titulo-edit" value="${sanitizeText(datos.titulo)}" 
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
                 maxlength="100" required>
          <small style="color: #666;">Máximo 100 caracteres</small>
        </div>
        <div style="margin-bottom: 15px;">
          <label for="nombre-edit" style="display: block; margin-bottom: 5px; font-weight: bold;">Nombre:</label>
          <input type="text" id="nombre-edit" value="${sanitizeText(datos.nombre)}" 
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
                 maxlength="50" required>
          <small style="color: #666;">Máximo 50 caracteres</small>
        </div>
        <div style="margin-bottom: 15px;">
          <label for="descripcion-edit" style="display: block; margin-bottom: 5px; font-weight: bold;">Descripción:</label>
          <textarea id="descripcion-edit" 
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px;" 
                    maxlength="500" required>${sanitizeText(datos.descripcion)}</textarea>
          <small style="color: #666;">Máximo 500 caracteres</small>
        </div>
        <div style="margin-bottom: 15px;">
          <label for="fecha-edit" style="display: block; margin-bottom: 5px; font-weight: bold;">Fecha de publicación:</label>
          <input type="text" id="fecha-edit" value="${sanitizeText(datos.fecha_publicacion)}" 
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" readonly>
          <small style="color: #666;">La fecha no se puede modificar</small>
        </div>
        <div id="errores-validacion" style="margin-bottom: 15px;"></div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" id="btn-cancelar" style="padding: 8px 15px; background-color: #ccc; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
          <button type="submit" id="btn-guardar" style="padding: 8px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Guardar Cambios</button>
        </div>
      `;

      // Añadir el formulario a la tarjeta
      tarjeta.appendChild(formulario);

      // Función para mostrar errores de validación
      function mostrarErroresValidacion(errores: string[]) {
        const contenedorErrores = formulario.querySelector('#errores-validacion');
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

      // Validación en tiempo real
      const inputs = formulario.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          const tituloInput = formulario.querySelector('#titulo-edit') as HTMLInputElement;
          const nombreInput = formulario.querySelector('#nombre-edit') as HTMLInputElement;
          const descripcionInput = formulario.querySelector('#descripcion-edit') as HTMLTextAreaElement;
          
          const validacion = validarDatosFormulario(
            tituloInput.value,
            nombreInput.value,
            descripcionInput.value
          );
          
          mostrarErroresValidacion(validacion.errores);
        });
      });

      // Manejar evento de cancelación
      const btnCancelar = formulario.querySelector('#btn-cancelar');
      if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
          formulario.remove();
        });
      }

      // Manejar envío del formulario
      formulario.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const tituloInput = formulario.querySelector('#titulo-edit') as HTMLInputElement;
        const nombreInput = formulario.querySelector('#nombre-edit') as HTMLInputElement;
        const descripcionInput = formulario.querySelector('#descripcion-edit') as HTMLTextAreaElement;
        const fechaInput = formulario.querySelector('#fecha-edit') as HTMLInputElement;
        
        // Validar datos
        const validacion = validarDatosFormulario(
          tituloInput.value,
          nombreInput.value,
          descripcionInput.value
        );

        if (!validacion.valido) {
          mostrarErroresValidacion(validacion.errores);
          return;
        }

        // Deshabilitar botón durante el envío
        const btnGuardar = formulario.querySelector('#btn-guardar') as HTMLButtonElement;
        btnGuardar.disabled = true;
        btnGuardar.innerText = 'Guardando...';
        
        // Crear objeto con datos actualizados
        const datosActualizados = {
          id: datos.id,
          titulo: tituloInput.value.trim(),
          nombre: nombreInput.value.trim(),
          descripcion: descripcionInput.value.trim(),
          fecha_publicacion: fechaInput.value
        };
        
        console.log("Enviando datos actualizados:", datosActualizados);
        
        // Enviar solicitud PUT al servidor
        const token = localStorage.getItem('token');
        fetch(`${apiUrl}/${datos.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(datosActualizados)
        })
        .then(response => {
          console.log("Estado de respuesta:", response.status);
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`Error al actualizar: ${response.status} - ${text}`);
            });
          }
          return response.json();
        })
        .then(responseData => {
          console.log("Respuesta del servidor:", responseData);
          mostrarNotificacion('Observación actualizada exitosamente', 'success');
          formulario.remove();
          
          // Actualizar los datos en la UI
          const tituloElement = tarjeta.querySelector('.observacion-container li:nth-child(1) p.text-card');
          const nombreElement = tarjeta.querySelector('.observacion-container li:nth-child(2) p.text-card');
          const descripcionElement = tarjeta.querySelector('.observacion-container li:nth-child(3) p.text-card');
          const fechaElement = tarjeta.querySelector('.observacion-container li:nth-child(4) p.text-card');
          
          if (tituloElement) tituloElement.textContent = datosActualizados.titulo;
          if (nombreElement) nombreElement.textContent = datosActualizados.nombre;
          if (descripcionElement) descripcionElement.textContent = datosActualizados.descripcion;
          if (fechaElement) fechaElement.textContent = datosActualizados.fecha_publicacion;
          
          // Recargar datos para asegurar sincronización
          obtenerObservaciones();
        })
        .catch(error => {
          console.error('Error:', error);
          mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
          // Rehabilitar botón
          btnGuardar.disabled = false;
          btnGuardar.innerText = 'Guardar Cambios';
        });
      });
    }

    // Referencia al formulario container
    const formContainer = document.getElementById('formContainer');



    function debugearRequest() {
      const token = localStorage.getItem('token');
      console.log('=== DEBUG INFO ===');
      console.log('API URL:', apiUrl);
      console.log('Token exists:', !!token);
      console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
      console.log('==================');
    }

    // Función para manejar envío del formulario principal
    function manejarEnvioFormulario(event: Event) {
      event.preventDefault();
      debugearRequest();
      console.log('Formulario enviado');
    
      const tituloInput = document.getElementById('titulo') as HTMLInputElement;
      const nombreInput = document.getElementById('nombre') as HTMLInputElement;
      const descripcionInput = document.getElementById('descripcion') as HTMLTextAreaElement;

      // Validar datos
      const validacion = validarDatosFormulario(
        tituloInput.value,
        nombreInput.value,
        descripcionInput.value
      );

      if (!validacion.valido) {
        mostrarErroresFormulario(validacion.errores);
        return;
      }

      // Deshabilitar botón de envío
      const submitBtn = document.querySelector('#observationForm button[type="submit"]') as HTMLButtonElement;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Guardando...';
      }
    
      const nuevaObservacion = {
        titulo: tituloInput.value.trim(),
        nombre: nombreInput.value.trim(),
        descripcion: descripcionInput.value.trim(),
      };
    
      console.log('Intentando enviar datos a:', apiUrl);
      console.log('Datos a enviar:', nuevaObservacion);
    

      const token = localStorage.getItem('token');
      console.log('Token being sent:', token ? 'Token exists' : 'No token found');
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nuevaObservacion)
      })
      .then(response => {
        console.log('Respuesta recibida:', response);
        if (!response.ok) {
          throw new Error(`Error al guardar la observación: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Datos guardados:', data);
        resetearFormulario();
        ocultarFormulario();
        obtenerObservaciones();
        mostrarNotificacion('Observación guardada con éxito', 'success');
      })
      .catch(error => {
        console.error('Error completo:', error);
        
        if (error.message.includes('Failed to fetch')) {
          mostrarNotificacion('No se pudo conectar al servidor. Verifica que esté funcionando en ' + apiUrl, 'error');
        } else {
          mostrarNotificacion('Error al guardar: ' + error.message, 'error');
        }
      })
      .finally(() => {
        // Rehabilitar botón
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Guardar';
        }
      });
    }

    // Función para mostrar errores en el formulario principal
    function mostrarErroresFormulario(errores: string[]) {
      // Remover errores anteriores
      const erroresAnteriores = document.querySelectorAll('.error-validacion');
      erroresAnteriores.forEach(error => error.remove());

      if (errores.length > 0) {
        const form = document.getElementById('observationForm');
        if (form) {
          const contenedorErrores = document.createElement('div');
          contenedorErrores.className = 'error-validacion';
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

    function resetearFormulario() {
      const form = document.getElementById('observationForm') as HTMLFormElement;
      if (form) {
        form.reset();
        // Remover errores de validación
        const errores = form.querySelectorAll('.error-validacion');
        errores.forEach(error => error.remove());
      }
    }

    function ocultarFormulario() {
      if (formContainer) {
        formContainer.style.display = 'none';
      }
    }

    // Función para mostrar notificaciones
    function mostrarNotificacion(mensaje: string, tipo: 'success' | 'error') {
      const notificacion = document.createElement('div');
      notificacion.className = `notificacion ${tipo}`;
      
      const estilosBase = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
      `;

      const estilosTipo = tipo === 'success' 
        ? 'background-color: #4CAF50; border-left: 5px solid #45a049;'
        : 'background-color: #f44336; border-left: 5px solid #d32f2f;';

      notificacion.style.cssText = estilosBase + estilosTipo;
      notificacion.textContent = mensaje;

      // Agregar estilos de animación si no existen
      if (!document.querySelector('#notificacion-styles')) {
        const style = document.createElement('style');
        style.id = 'notificacion-styles';
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(notificacion);

      // Remover después de 4 segundos con animación
      setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notificacion.parentNode) {
            notificacion.remove();
          }
        }, 300);
      }, 4000);
    }

    // Validación en tiempo real para el formulario principal
    function configurarValidacionTiempoReal() {
      const tituloInput = document.getElementById('titulo') as HTMLInputElement;
      const nombreInput = document.getElementById('nombre') as HTMLInputElement;
      const descripcionInput = document.getElementById('descripcion') as HTMLTextAreaElement;

      if (tituloInput && nombreInput && descripcionInput) {
        [tituloInput, nombreInput, descripcionInput].forEach(input => {
          input.addEventListener('input', () => {
            // Remover errores anteriores
            const erroresAnteriores = document.querySelectorAll('.error-validacion');
            erroresAnteriores.forEach(error => error.remove());

            // Solo validar si hay contenido en al menos un campo
            if (tituloInput.value.trim() || nombreInput.value.trim() || descripcionInput.value.trim()) {
              const validacion = validarDatosFormulario(
                tituloInput.value,
                nombreInput.value,
                descripcionInput.value
              );

              // Solo mostrar errores si todos los campos tienen contenido
              if (tituloInput.value.trim() && nombreInput.value.trim() && descripcionInput.value.trim()) {
                if (!validacion.valido) {
                  mostrarErroresFormulario(validacion.errores);
                }
              }
            }
          });
        });

        // Agregar contadores de caracteres
        agregarContadoresCaracteres();
      }
    }

    // Función para agregar contadores de caracteres
    function agregarContadoresCaracteres() {
      const campos = [
        { id: 'titulo', max: 100 },
        { id: 'nombre', max: 50 },
        { id: 'descripcion', max: 500 }
      ];

      campos.forEach(campo => {
        const input = document.getElementById(campo.id) as HTMLInputElement | HTMLTextAreaElement;
        if (input) {
          // Crear contador
          const contador = document.createElement('small');
          contador.style.cssText = 'color: #666; float: right; margin-top: 5px;';
          contador.textContent = `0/${campo.max}`;

          // Insertar después del input
          input.parentNode?.insertBefore(contador, input.nextSibling);

          // Actualizar contador
          const actualizarContador = () => {
            const longitud = input.value.length;
            contador.textContent = `${longitud}/${campo.max}`;
            
            if (longitud > campo.max * 0.9) {
              contador.style.color = '#ff9800';
            } else if (longitud >= campo.max) {
              contador.style.color = '#f44336';
            } else {
              contador.style.color = '#666';
            }
          };

          input.addEventListener('input', actualizarContador);
          actualizarContador(); // Inicializar
        }
      });
    }
    
    // Inicializar la aplicación
    obtenerObservaciones();

    // Configurar validación en tiempo real
    setTimeout(configurarValidacionTiempoReal, 100);
    
    // Configurar formulario principal
    const form = document.getElementById('observationForm');
    if (form) {
      form.addEventListener('submit', manejarEnvioFormulario);
      console.log('Event listener de submit configurado');
    } else {
      console.error('No se encontró el formulario');
    }

    // Configurar botón cancelar
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        resetearFormulario();
        ocultarFormulario();
      });
      console.log('Event listener de cancelar configurado'); 
    } else {
      console.error('No se encontró el botón cancelar');
    }

    // Configurar el botón para mostrar/ocultar el formulario
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
              primerInput.focus();
            }
          }, 100);
        } else {
          // Si se oculta, resetear el formulario
          resetearFormulario();
        }
        
        console.log('Formulario toggle:', formContainer.style.display);
      });
      console.log('Event listener de addBtn configurado');
    } else {
      console.error('No se encontró el botón para añadir o el contenedor del formulario');
    }

    // Función para validar conexión con el servidor (opcional)
    function verificarConexionServidor() {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token available for server verification');
        return;
      }

      fetch(apiUrl, { 
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
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

    // Verificar conexión al inicializar (opcional)
    verificarConexionServidor();

    // Manejar errores globales de JavaScript
    window.addEventListener('error', (event) => {
      console.error('Error global capturado:', event.error);
      mostrarNotificacion('Se produjo un error inesperado. Revisa la consola para más detalles.', 'error');
    });

    // Manejar promesas rechazadas no capturadas
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promesa rechazada no manejada:', event.reason);
      mostrarNotificacion('Error en la aplicación. Revisa la consola para más detalles.', 'error');
    });
  }
}