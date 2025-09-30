import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './insumos.component.html',
  styleUrls: ['./insumos.component.css']
})
export class InsumosComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    const apiUrl = `${environment.apiUrl}/insumos`;

    interface Insumo {
      id: number;
      producto: string;
      cantidadUsada: number;
      medida: string;
      fechaDeUso: string;
      costo: number;
      proveedor: string;
      userEmail: string;
      createdAt: string;
      updatedAt: string;
    }

    // Variable global para almacenar todos los insumos
    let todosLosInsumos: Insumo[] = [];
    let insumosFiltrados: Insumo[] = [];

    // Unidades de medida disponibles
    const unidadesMedida = [
      'unidades',
      'kilogramos', 
      'gramos',
      'litros',
      'mililitros'
    ];

    // Función para sanitizar texto
    function sanitizeText(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Función para formatear fecha
    function formatearFecha(fechaISO: string): string {
      const fecha = new Date(fechaISO);
      return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }

    // Función para formatear moneda
    function formatearMoneda(cantidad: number): string {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
      }).format(cantidad);
    }

    // Función para convertir fecha a formato YYYY-MM-DD para input date
    function convertirFechaParaInput(fecha: any): string {
      if (!fecha) return '';
      
      // Si es un array [año, mes, día] (como viene de Java LocalDate)
      if (Array.isArray(fecha) && fecha.length >= 3) {
        const year = fecha[0];
        const month = String(fecha[1]).padStart(2, '0');
        const day = String(fecha[2]).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Si es string, tomar los primeros 10 caracteres
      const fechaStr = String(fecha);
      return fechaStr.substring(0, 10);
    }

    // Función para validar datos del formulario
    function validarDatosFormulario(
      producto: string, 
      cantidadUsada: string, 
      medida: string, 
      fechaDeUso: string, 
      costo: string, 
      proveedor: string
    ): { valido: boolean, errores: string[] } {
      const errores: string[] = [];

      // Validar producto
      if (!producto.trim()) {
        errores.push('El producto es obligatorio');
      } else if (producto.trim().length < 2) {
        errores.push('El producto debe tener al menos 2 caracteres');
      } else if (producto.trim().length > 50) {
        errores.push('El producto no puede exceder 50 caracteres');
      }

      // Validar cantidad usada
      if (!cantidadUsada.trim()) {
        errores.push('La cantidad usada es obligatoria');
      } else {
        const cantidad = parseFloat(cantidadUsada);
        if (isNaN(cantidad) || cantidad <= 0) {
          errores.push('La cantidad usada debe ser un número mayor a cero');
        } else if (cantidad > 999999.99) {
          errores.push('La cantidad usada no puede ser mayor a 999,999.99');
        }
      }

      // Validar unidad de medida
      if (!medida || !unidadesMedida.includes(medida)) {
        errores.push('Debe seleccionar una unidad de medida válida');
      }

      // Validar fecha de uso
      if (!fechaDeUso.trim()) {
        errores.push('La fecha de uso es obligatoria');
      } else {
        const fecha = new Date(fechaDeUso);
        if (isNaN(fecha.getTime())) {
          errores.push('La fecha de uso debe ser una fecha válida');
        }
      }

      // Validar costo
      if (!costo.trim()) {
        errores.push('El costo es obligatorio');
      } else {
        const costoNum = parseFloat(costo);
        if (isNaN(costoNum) || costoNum < 0) {
          errores.push('El costo debe ser un número mayor o igual a cero');
        } else if (costoNum > 999999.99) {
          errores.push('El costo no puede ser mayor a 999,999.99');
        }
      }

      // Validar proveedor
      if (!proveedor.trim()) {
        errores.push('El proveedor es obligatorio');
      } else if (proveedor.trim().length < 2) {
        errores.push('El proveedor debe tener al menos 2 caracteres');
      } else if (proveedor.trim().length > 50) {
        errores.push('El proveedor no puede exceder 50 caracteres');
      }

      return {
        valido: errores.length === 0,
        errores
      };
    }

    // Función para filtrar insumos
    function filtrarInsumos() {
      const filtroProducto = (document.getElementById('filtroProducto') as HTMLInputElement)?.value.toLowerCase() || '';
      const filtroProveedor = (document.getElementById('filtroProveedor') as HTMLInputElement)?.value.toLowerCase() || '';
      const filtroFechaDesde = (document.getElementById('filtroFechaDesde') as HTMLInputElement)?.value || '';
      const filtroFechaHasta = (document.getElementById('filtroFechaHasta') as HTMLInputElement)?.value || '';

      insumosFiltrados = todosLosInsumos.filter(insumo => {
        // Filtro por producto
        const cumpleProducto = !filtroProducto || 
          insumo.producto.toLowerCase().includes(filtroProducto);

        // Filtro por proveedor
        const cumpleProveedor = !filtroProveedor || 
          insumo.proveedor.toLowerCase().includes(filtroProveedor);

        // Filtro por fecha desde
        const cumpleFechaDesde = !filtroFechaDesde || 
          new Date(insumo.fechaDeUso) >= new Date(filtroFechaDesde);

        // Filtro por fecha hasta
        const cumpleFechaHasta = !filtroFechaHasta || 
          new Date(insumo.fechaDeUso) <= new Date(filtroFechaHasta);

        return cumpleProducto && cumpleProveedor && cumpleFechaDesde && cumpleFechaHasta;
      });

      renderizarInsumos(insumosFiltrados);
    }

    // Función para limpiar filtros
    function limpiarFiltros() {
      (document.getElementById('filtroProducto') as HTMLInputElement).value = '';
      (document.getElementById('filtroProveedor') as HTMLInputElement).value = '';
      (document.getElementById('filtroFechaDesde') as HTMLInputElement).value = '';
      (document.getElementById('filtroFechaHasta') as HTMLInputElement).value = '';
      
      insumosFiltrados = [...todosLosInsumos];
      renderizarInsumos(insumosFiltrados);
    }

    // Función para configurar event listeners de filtros
    function configurarFiltros() {
      const filtroProducto = document.getElementById('filtroProducto');
      const filtroProveedor = document.getElementById('filtroProveedor');
      const filtroFechaDesde = document.getElementById('filtroFechaDesde');
      const filtroFechaHasta = document.getElementById('filtroFechaHasta');
      const btnFiltrar = document.getElementById('btnFiltrar');
      const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

      // Event listeners para filtrado automático
      filtroProducto?.addEventListener('input', filtrarInsumos);
      filtroProveedor?.addEventListener('input', filtrarInsumos);
      filtroFechaDesde?.addEventListener('change', filtrarInsumos);
      filtroFechaHasta?.addEventListener('change', filtrarInsumos);

      // Event listeners para botones
      btnFiltrar?.addEventListener('click', filtrarInsumos);
      btnLimpiarFiltros?.addEventListener('click', limpiarFiltros);
    }

    // Función para mostrar modal de confirmación
    function mostrarConfirmacion(mensaje: string): Promise<boolean> {
      return new Promise((resolve) => {
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

    // Función para renderizar los insumos
    function renderizarInsumos(insumos: Insumo[]) {
      const listaInsumos = document.getElementById('lista-insumos');
      if (!listaInsumos) return;

      listaInsumos.innerHTML = '';
      listaInsumos.style.backgroundColor = 'transparent';
      listaInsumos.style.boxShadow = 'none';
      listaInsumos.style.width = '100%';

      if (insumos.length === 0) {
        listaInsumos.innerHTML = `
          <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
            <h3 style="margin: 0 0 8px 0; color: #333;">No se encontraron insumos</h3>
            <p style="margin: 0;">No hay insumos que coincidan con los filtros aplicados</p>
          </div>
        `;
        return;
      }

      insumos.forEach((insumo: Insumo) => {
        const nuevaTarjeta = document.createElement('div');
        nuevaTarjeta.className = 'card blue-cake';
        
        nuevaTarjeta.style.cssText = `
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 32px;
          width: 70%;
          min-width: 320px;
          margin: 0 auto 24px auto;
          text-align: left;
          border: 1px solid rgba(226, 232, 240, 0.8);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        `;

        nuevaTarjeta.addEventListener('mouseenter', () => {
          nuevaTarjeta.style.transform = 'translateY(-4px)';
          nuevaTarjeta.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)';
        });

        nuevaTarjeta.addEventListener('mouseleave', () => {
          nuevaTarjeta.style.transform = 'translateY(0)';
          nuevaTarjeta.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)';
        });

        const contenidoContainer = document.createElement('div');
        contenidoContainer.style.cssText = 'margin-bottom: 24px;';

        // Título - Producto
        const productoContainer = document.createElement('div');
        productoContainer.style.cssText = `
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
        `;
        
        const productoLabel = document.createElement('span');
        productoLabel.textContent = 'Producto';
        productoLabel.style.cssText = `
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        `;
        
        const productoValor = document.createElement('h3');
        productoValor.textContent = sanitizeText(insumo.producto);
        productoValor.style.cssText = `
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.3;
        `;
        
        productoContainer.appendChild(productoLabel);
        productoContainer.appendChild(productoValor);

        // Grid de información
        const infoGrid = document.createElement('div');
        infoGrid.style.cssText = `
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        `;

        // Cantidad y unidad
        const cantidadContainer = document.createElement('div');
        cantidadContainer.style.cssText = `
          padding: 16px;
          background: #f1f5f9;
          border-radius: 10px;
          border-left: 4px solid #10b981;
        `;
        
        cantidadContainer.innerHTML = `
          <span style="
            display: block;
            font-size: 11px;
            font-weight: 500;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
          ">Cantidad</span>
          <span style="
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
          ">${insumo.cantidadUsada} ${insumo.medida}</span>
        `;

        // Costo
        const costoContainer = document.createElement('div');
        costoContainer.style.cssText = `
          padding: 16px;
          background: #f1f5f9;
          border-radius: 10px;
          border-left: 4px solid #3b82f6;
        `;
        
        costoContainer.innerHTML = `
          <span style="
            display: block;
            font-size: 11px;
            font-weight: 500;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
          ">Costo</span>
          <span style="
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
          ">${formatearMoneda(insumo.costo)}</span>
        `;

        infoGrid.appendChild(cantidadContainer);
        infoGrid.appendChild(costoContainer);

        // Proveedor
        const proveedorContainer = document.createElement('div');
        proveedorContainer.style.cssText = `
          display: flex;
          align-items: center;
          margin-bottom: 18px;
          padding: 12px 16px;
          background: #fef3c7;
          border-radius: 10px;
          border-left: 4px solid #f59e0b;
        `;
        
        const proveedorIcon = document.createElement('div');
        proveedorIcon.innerHTML = '🏪';
        proveedorIcon.style.cssText = `
          font-size: 18px;
          margin-right: 12px;
        `;
        
        const proveedorTexto = document.createElement('div');
        proveedorTexto.innerHTML = `
          <span style="
            display: block;
            font-size: 11px;
            font-weight: 500;
            color: #92400e;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          ">Proveedor</span>
          <span style="
            display: block;
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            margin-top: 2px;
          ">${sanitizeText(insumo.proveedor)}</span>
        `;
        
        proveedorContainer.appendChild(proveedorIcon);
        proveedorContainer.appendChild(proveedorTexto);

        // Fecha de uso
        const fechaContainer = document.createElement('div');
        fechaContainer.style.cssText = `
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 10px;
          border-left: 4px solid #6366f1;
          margin-bottom: 24px;
        `;
        
        fechaContainer.innerHTML = `
          <span style="font-size: 16px; margin-right: 10px;">📅</span>
          <div>
            <span style="
              display: block;
              font-size: 11px;
              font-weight: 500;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            ">Fecha de uso</span>
            <span style="
              display: block;
              font-size: 14px;
              font-weight: 600;
              color: #1e293b;
              margin-top: 2px;
            ">${formatearFecha(insumo.fechaDeUso)}</span>
          </div>
        `;

        contenidoContainer.appendChild(productoContainer);
        contenidoContainer.appendChild(infoGrid);
        contenidoContainer.appendChild(proveedorContainer);
        contenidoContainer.appendChild(fechaContainer);

        nuevaTarjeta.appendChild(contenidoContainer);

        // Botones
        const botonesContainer = document.createElement('div');
        botonesContainer.style.cssText = `
          display: flex;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        `;

        // Botón actualizar
        const botonActualizar = document.createElement('button');
        botonActualizar.innerHTML = 'Actualizar';
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
          mostrarFormularioActualizacion(insumo, nuevaTarjeta);
        });

        // Botón eliminar
        const botonEliminar = document.createElement('button');
        botonEliminar.innerHTML = 'Eliminar';
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

        botonEliminar.addEventListener('click', async () => {
          const confirmado = await mostrarConfirmacion(
            `¿Estás seguro de que deseas eliminar el insumo "${insumo.producto}"? Esta acción no se puede deshacer.`
          );
          
          if (confirmado) {
            botonEliminar.disabled = true;
            botonEliminar.innerHTML = 'Eliminando...';
            
            const token = localStorage.getItem('token');
            fetch(`${apiUrl}/${insumo.id}`, { 
              method: 'DELETE', 
              headers: {'Authorization': `Bearer ${token}`}
            })
            .then(response => {
              if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
              }
              mostrarNotificacion('Insumo eliminado exitosamente', 'success');
              todosLosInsumos = todosLosInsumos.filter(i => i.id !== insumo.id);
              filtrarInsumos();
            })
            .catch(error => {
              console.error('Error en la eliminación:', error);
              mostrarNotificacion('Error al eliminar el insumo: ' + error.message, 'error');
              botonEliminar.disabled = false;
              botonEliminar.innerHTML = 'Eliminar';
            });
          }
        });

        botonesContainer.appendChild(botonActualizar);
        botonesContainer.appendChild(botonEliminar);
        nuevaTarjeta.appendChild(botonesContainer);
        listaInsumos.appendChild(nuevaTarjeta);
      });
    }

    // Función para obtener insumos
    function obtenerInsumos() {
      const token = localStorage.getItem('token');
      if (!token) {
        mostrarNotificacion('No hay sesión activa. Redirigiendo al login...', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      const listaInsumos = document.getElementById('lista-insumos');
      if (listaInsumos) {
        listaInsumos.innerHTML = '<p style="text-align: center; padding: 20px;">Cargando insumos...</p>';
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
      .then((data: Insumo[]) => {
        todosLosInsumos = data;
        insumosFiltrados = [...data];
        renderizarInsumos(insumosFiltrados);
      })
      .catch(error => {
        console.error('Error al obtener insumos:', error);
        if (listaInsumos) {
          listaInsumos.innerHTML = `
            <p style="text-align: center; padding: 20px; color: #FF6B6B;">
              Error al cargar los insumos: ${error.message}
            </p>
          `;
        }
        mostrarNotificacion('Error al cargar los insumos', 'error');
      });
    }

    // Función para mostrar formulario de actualización
    function mostrarFormularioActualizacion(insumo: Insumo, tarjeta: HTMLElement) {
      const formularioExistente = tarjeta.querySelector('form');
      if (formularioExistente) {
        mostrarNotificacion('Ya hay un formulario de edición abierto', 'error');
        return;
      }

      const formulario = document.createElement('form');
      formulario.className = 'form-edicion';
      formulario.style.cssText = `
        margin-top: 20px;
        padding: 24px;
        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
      `;

      const opcionesUnidades = unidadesMedida.map(unidad => 
        `<option value="${unidad}" ${unidad === insumo.medida ? 'selected' : ''}>${unidad}</option>`
      ).join('');

      formulario.innerHTML = `
        <div class="form-grid-edit" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div class="form-group-edit">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px;">Producto *</label>
            <input type="text" id="producto-edit" value="${sanitizeText(insumo.producto)}" 
                   style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s;" 
                   maxlength="50" required>
          </div>
          <div class="form-group-edit">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px;">Proveedor *</label>
            <input type="text" id="proveedor-edit" value="${sanitizeText(insumo.proveedor)}" 
                   style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s;" 
                   maxlength="50" required>
          </div>
          <div class="form-group-edit">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px;">Cantidad Usada *</label>
            <input type="number" id="cantidad-edit" value="${insumo.cantidadUsada}" 
                   style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s;" 
                   step="0.01" min="0" max="999999.99" required>
          </div>
          <div class="form-group-edit">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px;">Unidad *</label>
            <select id="medida-edit" 
                    style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s;" required>
              ${opcionesUnidades}
            </select>
          </div>
          <div class="form-group-edit">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px;">Costo *</label>
            <input type="number" id="costo-edit" value="${insumo.costo}" 
                   style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s;" 
                   step="0.01" min="0" max="999999.99" required>
          </div>
          <div class="form-group-edit">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px;">Fecha de uso *</label>
            <input type="date" id="fecha-edit" value="${convertirFechaParaInput(insumo.fechaDeUso)}" 
                   style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s;" required>
          </div>
        </div>
        <div id="errores-validacion" style="margin-bottom: 20px;"></div>
        <div class="form-actions-edit" style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" id="btn-cancelar" class="btn-form btn-cancelar" style="
            padding: 12px 24px;
            background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
          ">
            Cancelar
          </button>
          <button type="submit" id="btn-guardar" class="btn-form btn-guardar" style="
            padding: 12px 24px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
          ">
            Guardar Cambios
          </button>
        </div>
      `;

      tarjeta.appendChild(formulario);

      const btnCancelar = formulario.querySelector('#btn-cancelar') as HTMLElement;
      const btnGuardar = formulario.querySelector('#btn-guardar') as HTMLElement;

      if (btnCancelar) {
        btnCancelar.addEventListener('mouseenter', () => {
          btnCancelar.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
          btnCancelar.style.transform = 'translateY(-1px)';
        });
        btnCancelar.addEventListener('mouseleave', () => {
          btnCancelar.style.background = 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)';
          btnCancelar.style.transform = 'translateY(0)';
        });
      }

      if (btnGuardar) {
        btnGuardar.addEventListener('mouseenter', () => {
          btnGuardar.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
          btnGuardar.style.transform = 'translateY(-1px)';
          btnGuardar.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
        });
        btnGuardar.addEventListener('mouseleave', () => {
          btnGuardar.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
          btnGuardar.style.transform = 'translateY(0)';
          btnGuardar.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
        });
      }

      const inputs = formulario.querySelectorAll('input, select');
      inputs.forEach(input => {
        const element = input as HTMLElement;
        element.addEventListener('focus', () => {
          element.style.borderColor = '#3b82f6';
          element.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        });
        element.addEventListener('blur', () => {
          element.style.borderColor = '#e5e7eb';
          element.style.boxShadow = 'none';
        });
      });

      function mostrarErroresValidacion(errores: string[]) {
        const contenedorErrores = formulario.querySelector('#errores-validacion');
        if (contenedorErrores) {
          if (errores.length > 0) {
            contenedorErrores.innerHTML = `
              <div class="errores-validacion" style="
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border: 2px solid #fecaca;
                border-radius: 8px;
                padding: 16px;
                color: #dc2626;
              ">
                <strong style="display: block; margin-bottom: 8px;">Errores de validación:</strong>
                <ul style="margin: 0; padding-left: 20px;">
                  ${errores.map(error => `<li style="margin-bottom: 4px;">${error}</li>`).join('')}
                </ul>
              </div>
            `;
          } else {
            contenedorErrores.innerHTML = '';
          }
        }
      }

      btnCancelar?.addEventListener('click', () => {
        formulario.remove();
      });

      formulario.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const productoInput = formulario.querySelector('#producto-edit') as HTMLInputElement;
        const cantidadInput = formulario.querySelector('#cantidad-edit') as HTMLInputElement;
        const medidaInput = formulario.querySelector('#medida-edit') as HTMLSelectElement;
        const fechaInput = formulario.querySelector('#fecha-edit') as HTMLInputElement;
        const costoInput = formulario.querySelector('#costo-edit') as HTMLInputElement;
        const proveedorInput = formulario.querySelector('#proveedor-edit') as HTMLInputElement;
        
        const validacion = validarDatosFormulario(
          productoInput.value,
          cantidadInput.value,
          medidaInput.value,
          fechaInput.value,
          costoInput.value,
          proveedorInput.value
        );

        if (!validacion.valido) {
          mostrarErroresValidacion(validacion.errores);
          return;
        }

        const btnGuardar = formulario.querySelector('#btn-guardar') as HTMLButtonElement;
        btnGuardar.disabled = true;
        btnGuardar.innerText = 'Guardando...';
        
        const datosActualizados = {
          producto: productoInput.value.trim(),
          cantidadUsada: parseFloat(cantidadInput.value),
          medida: medidaInput.value,
          fechaDeUso: fechaInput.value,
          costo: parseFloat(costoInput.value),
          proveedor: proveedorInput.value.trim()
        };
        
        const token = localStorage.getItem('token');
        fetch(`${apiUrl}/${insumo.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(datosActualizados)
        })
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`Error al actualizar: ${response.status} - ${text}`);
            });
          }
          return response.json();
        })
        .then(responseData => {
          mostrarNotificacion('Insumo actualizado exitosamente', 'success');
          formulario.remove();
          obtenerInsumos();
        })
        .catch(error => {
          console.error('Error:', error);
          mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
          btnGuardar.disabled = false;
          btnGuardar.innerText = 'Guardar Cambios';
        });
      });
    }

    function manejarEnvioFormulario(event: Event) {
      event.preventDefault();
      
      const productoInput = document.getElementById('producto') as HTMLInputElement;
      const cantidadInput = document.getElementById('cantidad') as HTMLInputElement;
      const medidaInput = document.getElementById('medida') as HTMLSelectElement;
      const fechaInput = document.getElementById('fecha') as HTMLInputElement;
      const costoInput = document.getElementById('costo') as HTMLInputElement;
      const proveedorInput = document.getElementById('proveedor') as HTMLInputElement;

      const validacion = validarDatosFormulario(
        productoInput.value,
        cantidadInput.value,
        medidaInput.value,
        fechaInput.value,
        costoInput.value,
        proveedorInput.value
      );

      if (!validacion.valido) {
        mostrarErroresFormulario(validacion.errores);
        return;
      }

      const submitBtn = document.querySelector('#insumoForm button[type="submit"]') as HTMLButtonElement;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Guardando...';
      }
    
      const nuevoInsumo = {
        producto: productoInput.value.trim(),
        cantidadUsada: parseFloat(cantidadInput.value),
        medida: medidaInput.value,
        fechaDeUso: fechaInput.value,
        costo: parseFloat(costoInput.value),
        proveedor: proveedorInput.value.trim()
      };
    
      const token = localStorage.getItem('token');
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nuevoInsumo)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error al guardar el insumo: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        resetearFormulario();
        ocultarFormulario();
        obtenerInsumos();
        mostrarNotificacion('Insumo guardado con éxito', 'success');
      })
      .catch(error => {
        console.error('Error:', error);
        if (error.message.includes('Failed to fetch')) {
          mostrarNotificacion('No se pudo conectar al servidor. Verifica que esté funcionando en ' + apiUrl, 'error');
        } else {
          mostrarNotificacion('Error al guardar: ' + error.message, 'error');
        }
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Guardar';
        }
      });
    }

    function mostrarErroresFormulario(errores: string[]) {
      const erroresAnteriores = document.querySelectorAll('.error-validacion');
      erroresAnteriores.forEach(error => error.remove());

      if (errores.length > 0) {
        const form = document.getElementById('insumoForm');
        if (form) {
          const contenedorErrores = document.createElement('div');
          contenedorErrores.className = 'error-validacion';
          contenedorErrores.style.cssText = `
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border: 2px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            color: #dc2626;
          `;
          
          contenedorErrores.innerHTML = `
            <strong style="display: block; margin-bottom: 8px;">Errores de validación:</strong>
            <ul style="margin: 0; padding-left: 20px;">
              ${errores.map(error => `<li style="margin-bottom: 4px;">${error}</li>`).join('')}
            </ul>
          `;
          
          form.insertBefore(contenedorErrores, form.firstChild);
        }
      }
    }

    function resetearFormulario() {
      const form = document.getElementById('insumoForm') as HTMLFormElement;
      if (form) {
        form.reset();
        const errores = form.querySelectorAll('.error-validacion');
        errores.forEach(error => error.remove());
      }
    }

    function ocultarFormulario() {
      const formContainer = document.getElementById('formContainer');
      if (formContainer) {
        formContainer.style.display = 'none';
      }
    }

    function mostrarNotificacion(mensaje: string, tipo: 'success' | 'error') {
      const notificacion = document.createElement('div');
      notificacion.className = `notificacion ${tipo}`;
      
      const estilosBase = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        max-width: 350px;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      `;

      const estilosTipo = tipo === 'success' 
        ? 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-left: 4px solid #047857;'
        : 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-left: 4px solid #b91c1c;';

      notificacion.style.cssText = estilosBase + estilosTipo;
      notificacion.textContent = mensaje;

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

      setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notificacion.parentNode) {
            notificacion.remove();
          }
        }, 300);
      }, 4000);
    }

    function configurarValidacionTiempoReal() {
      const campos = ['producto', 'cantidad', 'medida', 'fecha', 'costo', 'proveedor'];
      
      campos.forEach(campo => {
        const input = document.getElementById(campo);
        if (input) {
          input.addEventListener('input', () => {
            const erroresAnteriores = document.querySelectorAll('.error-validacion');
            erroresAnteriores.forEach(error => error.remove());
          });
        }
      });

      const camposTexto = [
        { id: 'producto', max: 50 },
        { id: 'proveedor', max: 50 }
      ];

      camposTexto.forEach(campo => {
        const input = document.getElementById(campo.id) as HTMLInputElement;
        if (input) {
          const contador = document.createElement('small');
          contador.style.cssText = 'color: #6b7280; float: right; margin-top: 5px; font-weight: 500;';
          contador.textContent = `0/${campo.max}`;

          input.parentNode?.insertBefore(contador, input.nextSibling);

          const actualizarContador = () => {
            const longitud = input.value.length;
            contador.textContent = `${longitud}/${campo.max}`;
            
            if (longitud > campo.max * 0.9) {
              contador.style.color = '#f59e0b';
            } else if (longitud >= campo.max) {
              contador.style.color = '#ef4444';
            } else {
              contador.style.color = '#6b7280';
            }
          };

          input.addEventListener('input', actualizarContador);
          actualizarContador();
        }
      });
    }
    
    obtenerInsumos();
    setTimeout(configurarFiltros, 100);
    setTimeout(configurarValidacionTiempoReal, 100);
    
    const form = document.getElementById('insumoForm');
    if (form) {
      form.addEventListener('submit', manejarEnvioFormulario);
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        resetearFormulario();
        ocultarFormulario();
      });
    }

    const addBtn = document.getElementById('addBtn');
    const formContainer = document.getElementById('formContainer');
    
    if (addBtn && formContainer) {
      formContainer.style.display = 'none';
      
      addBtn.addEventListener('click', () => {
        const estaVisible = formContainer.style.display !== 'none';
        formContainer.style.display = estaVisible ? 'none' : 'block';
        
        if (!estaVisible) {
          setTimeout(() => {
            const primerInput = formContainer.querySelector('input');
            if (primerInput) {
              primerInput.focus();
            }
          }, 100);
        } else {
          resetearFormulario();
        }
      });
    }

    function verificarConexionServidor() {
      const token = localStorage.getItem('token');
      if (!token) return;

      fetch(apiUrl, { 
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(response => {
          if (!response.ok) {
            console.warn('El servidor respondió pero con estado:', response.status);
          }
        })
        .catch(error => {
          console.error('No se pudo conectar al servidor:', error);
          mostrarNotificacion('No se pudo conectar al servidor. Verifica que esté funcionando.', 'error');
        });
    }

    verificarConexionServidor();

    window.addEventListener('error', (event) => {
      console.error('Error global capturado:', event.error);
      mostrarNotificacion('Se produjo un error inesperado. Revisa la consola para más detalles.', 'error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promesa rechazada no manejada:', event.reason);
      mostrarNotificacion('Error en la aplicación. Revisa la consola para más detalles.', 'error');
    });
  }
}