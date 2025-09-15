import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart } from 'chart.js';

interface DatosSensor {
  timestamp: string;
  temperaturaAmbiente: number;
  humedadAmbiente: number;
  temperaturaSuelo: number;
  humedadSuelo: number;
  device: {
    deviceCode: string;
    macAddress: string;
    chipId: string;
  };
  batteryLevel: number;
}

interface Insumo {
  id: number;
  producto: string;
  cantidadUsada: number;
  medida: string;
  fechaDeUso: string;
  costo: number;
  proveedor: string;
}

@Component({
  selector: 'app-vista-reportes',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './vista-reportes.component.html',
  styleUrls: ['./vista-reportes.component.css']
})
export class VistaReportesComponent {
  fechaInicio: string = '';
  fechaFin: string = '';
  isGenerating: boolean = false;
  
  // URLs de los endpoints
  private apiUrl = 'http://localhost:8080/api';
  
  opcionesReporte = [
    { valor: 'temperatura-suelo', etiqueta: 'Temperatura del Suelo', seleccionado: false },
    { valor: 'humedad-suelo', etiqueta: 'Humedad del Suelo', seleccionado: false },
    { valor: 'temperatura-ambiente', etiqueta: 'Temperatura del Ambiente', seleccionado: false },
    { valor: 'humedad-ambiente', etiqueta: 'Humedad del Ambiente', seleccionado: false },
    { valor: 'insumos', etiqueta: 'Insumos', seleccionado: false }
  ];

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async onSubmit(): Promise<void> {
    console.log('=== INICIANDO GENERACIÓN DE REPORTE ===');

    
    // Validaciones
    if (!this.fechaInicio || !this.fechaFin) {
      alert('Por favor, seleccione ambas fechas');
      return;
    }

    if (this.fechaFin < this.fechaInicio) {
      alert('La fecha de finalización no puede ser anterior a la fecha de inicio');
      return;
    }

    const algunoSeleccionado = this.opcionesReporte.some(o => o.seleccionado);
    if (!algunoSeleccionado) {
      alert('Por favor, seleccione al menos un elemento para incluir en el reporte');
      return;
    }

    console.log('Validaciones pasadas. Configuración:', {
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      opcionesSeleccionadas: this.opcionesReporte.filter(o => o.seleccionado).map(o => o.valor)
    });

    this.isGenerating = true;

    try {
      // Mostrar progreso
      console.log('1/3 Obteniendo datos...');
      
      // Obtener datos según las selecciones
      const datosReporte = await this.obtenerDatosReporte();
      
      console.log('2/3 Datos obtenidos:', {
        datosSensor: datosReporte.datosSensor?.length || 0,
        insumos: datosReporte.insumos?.length || 0
      });
      
      // Verificar si hay datos para generar el reporte
      const tieneDatosSensor = datosReporte.datosSensor && datosReporte.datosSensor.length > 0;
      const tieneDatosInsumos = datosReporte.insumos && datosReporte.insumos.length > 0;
      
      if (!tieneDatosSensor && !tieneDatosInsumos) {
        alert('No se encontraron datos para el período seleccionado. Por favor verifique las fechas y que tenga datos registrados.');
        return;
      }
      
      console.log('3/3 Generando PDF...');
      
      // Generar el PDF
      this.generarPDF(datosReporte);
      
      console.log('✅ Reporte generado exitosamente');
      alert('Reporte generado exitosamente y descargado');
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      
      // Mensaje de error más específico
      let errorMessage = 'Error al generar el reporte.';
      
      if (error instanceof Error) {
        errorMessage += ` Detalle: ${error.message}`;
      }
      
      alert(errorMessage + ' Por favor, revise la consola para más detalles e intente nuevamente.');
    } finally {
      this.isGenerating = false;
    }
  }

  private async obtenerDatosReporte(): Promise<any> {
    console.log('=== OBTENIENDO DATOS PARA REPORTE ===');
    
    const datos: any = {
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      opciones: this.opcionesReporte.filter(o => o.seleccionado).map(o => o.valor)
    };

    console.log('Opciones seleccionadas:', datos.opciones);

    // Obtener datos de sensores si alguna opción de sensor está seleccionada
    const opcionesSensor = ['temperatura-suelo', 'humedad-suelo', 'temperatura-ambiente', 'humedad-ambiente'];
    const necesitaDatosSensor = this.opcionesReporte
      .filter(o => o.seleccionado && opcionesSensor.includes(o.valor))
      .length > 0;

    if (necesitaDatosSensor) {
      console.log('Obteniendo datos de sensores...');
      try {
        // Calcular horas entre fechas de manera más precisa
        const fechaInicioDate = new Date(this.fechaInicio + 'T00:00:00');
        const fechaFinDate = new Date(this.fechaFin + 'T23:59:59');
        const diffTime = fechaFinDate.getTime() - fechaInicioDate.getTime();
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60)) + 24; // Agregar buffer

        console.log('Rango de fechas:', {
          inicio: fechaInicioDate,
          fin: fechaFinDate,
          horas: diffHours
        });

        const response = await this.http.get<DatosSensor[]>(
          `${this.apiUrl}/user/sensor-data?hours=${diffHours}`,
          { headers: this.getAuthHeaders() }
        ).toPromise();

        console.log('Respuesta cruda de sensores:', response);

        // Filtrar por fechas de manera más precisa
        const datosFiltrados = (response || []).filter(item => {
          const itemDate = new Date(item.timestamp);
          return itemDate >= fechaInicioDate && itemDate <= fechaFinDate;
        });

        datos.datosSensor = datosFiltrados;
        console.log('Datos de sensores filtrados:', datosFiltrados.length);

      } catch (error) {
        console.error('Error obteniendo datos de sensores:', error);
        datos.datosSensor = [];
        
        // Mostrar alerta específica para datos de sensores
        if (necesitaDatosSensor) {
          alert('Advertencia: No se pudieron obtener datos de sensores. El reporte se generará solo con los datos disponibles.');
        }
      }
    } else {
      console.log('No se necesitan datos de sensores');
      datos.datosSensor = [];
    }

    // Obtener datos de insumos si está seleccionado
    if (this.opcionesReporte.find(o => o.valor === 'insumos' && o.seleccionado)) {
      console.log('Obteniendo datos de insumos...');
      try {
        const response = await this.http.get<Insumo[]>(
          `${this.apiUrl}/insumos?fechaDesde=${this.fechaInicio}&fechaHasta=${this.fechaFin}`,
          { headers: this.getAuthHeaders() }
        ).toPromise();
        
        datos.insumos = response || [];
        console.log('Datos de insumos obtenidos:', datos.insumos.length);
        
      } catch (error) {
        console.error('Error obteniendo insumos:', error);
        datos.insumos = [];
        
        // Mostrar alerta específica para insumos
        alert('Advertencia: No se pudieron obtener datos de insumos. El reporte se generará solo con los datos disponibles.');
      }
    } else {
      console.log('No se necesitan datos de insumos');
      datos.insumos = [];
    }

    console.log('=== DATOS FINALES PARA REPORTE ===');
    console.log('Datos sensor:', datos.datosSensor?.length || 0);
    console.log('Datos insumos:', datos.insumos?.length || 0);

    return datos;
  }

  private generarPDF(datos: any): void {
    console.log('=== INICIANDO GENERACIÓN PDF ===');
    console.log('Datos recibidos:', datos);

    if (datos.datosSensor && datos.datosSensor.length > 0) {
      console.log('Estructura completa del primer dato:', datos.datosSensor[0]);
      console.log('Todas las propiedades:', Object.keys(datos.datosSensor[0]));
    }


    const doc = new jsPDF();
    let currentY = 20;

    const primaryColor: [number, number, number] = [75, 192, 192];
    const secondaryColor: [number, number, number] = [54, 162, 235];
    
    // AGREGAR ENCABEZADO DEL REPORTE
    this.agregarEncabezadoPDF(doc, datos);
    currentY = 50;

    // Verificar si hay datos para mostrar
    let tieneContenido = false;

    // Procesar datos de sensores
    if (datos.datosSensor && datos.datosSensor.length > 0) {
      console.log('Procesando datos de sensores:', datos.datosSensor.length);
      tieneContenido = true;

      // Temperatura del Suelo
      if (this.opcionesReporte.find(o => o.valor === 'temperatura-suelo' && o.seleccionado)) {
        console.log('Agregando sección: Temperatura del Suelo');
        currentY = this.agregarSeccionSensor(doc, currentY, datos.datosSensor, 
          'Temperatura del Suelo', 'temperaturaSuelo', '°C', primaryColor);
      }

      // Humedad del Suelo
      if (this.opcionesReporte.find(o => o.valor === 'humedad-suelo' && o.seleccionado)) {
        console.log('Agregando sección: Humedad del Suelo');
        currentY = this.agregarSeccionSensor(doc, currentY, datos.datosSensor, 
          'Humedad del Suelo', 'humedadSuelo', '%', secondaryColor);
      }

      // Temperatura Ambiente
      if (this.opcionesReporte.find(o => o.valor === 'temperatura-ambiente' && o.seleccionado)) {
        console.log('Agregando sección: Temperatura Ambiente');
        currentY = this.agregarSeccionSensor(doc, currentY, datos.datosSensor, 
          'Temperatura del Ambiente', 'temperaturaAmbiente', '°C', [255, 99, 132] as [number, number, number]);
      }

      // Humedad Ambiente
      if (this.opcionesReporte.find(o => o.valor === 'humedad-ambiente' && o.seleccionado)) {
        console.log('Agregando sección: Humedad Ambiente');
        currentY = this.agregarSeccionSensor(doc, currentY, datos.datosSensor, 
          'Humedad del Ambiente', 'humedadAmbiente', '%', [54, 162, 235] as [number, number, number]);
      }
    } else {
      console.log('No hay datos de sensores disponibles');
    }

    // Procesar datos de insumos
    if (datos.insumos && datos.insumos.length > 0 && 
        this.opcionesReporte.find(o => o.valor === 'insumos' && o.seleccionado)) {
      console.log('Procesando insumos:', datos.insumos.length);
      tieneContenido = true;
      currentY = this.agregarSeccionInsumos(doc, currentY, datos.insumos);
    } else {
      console.log('No hay datos de insumos disponibles o no seleccionados');
    }

    // Si no hay contenido, agregar mensaje
    if (!tieneContenido) {
      this.agregarMensajeSinDatos(doc, currentY);
    }

    // Pie de página en todas las páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
      doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, 105, 290, { align: 'center' });
    }

    // Descargar el PDF
    const nombreArchivo = `reporte_${this.fechaInicio}_${this.fechaFin}.pdf`;
    doc.save(nombreArchivo);
    
    console.log('=== PDF GENERADO EXITOSAMENTE ===');
    console.log('Archivo:', nombreArchivo);
  }

  private agregarEncabezadoPDF(doc: jsPDF, datos: any): void {
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Reporte de Datos', 105, 25, { align: 'center' });
    
    // Información del reporte
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Período: ${this.formatearFecha(this.fechaInicio)} - ${this.formatearFecha(this.fechaFin)}`, 105, 35, { align: 'center' });
    
    // Usuario (si está disponible)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email) {
      doc.setFontSize(10);
      doc.text(`Usuario: ${user.email}`, 105, 42, { align: 'center' });
    }
    
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 47, 190, 47);
  }

  private agregarMensajeSinDatos(doc: jsPDF, startY: number): void {
    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150);
    doc.text('No se encontraron datos para el período seleccionado', 105, startY + 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('Verifique que:', 105, startY + 50, { align: 'center' });
    doc.text('• Las fechas sean correctas', 105, startY + 60, { align: 'center' });
    doc.text('• Tenga dispositivos vinculados y enviando datos', 105, startY + 70, { align: 'center' });
    doc.text('• Haya insumos registrados en el período', 105, startY + 80, { align: 'center' });
  }

  private validarDatosSensor(dato: any, campo: string): boolean {
    const valor = dato[campo];
    return valor !== null && valor !== undefined && !isNaN(valor) && isFinite(valor);
  }



  private agregarSeccionSensor(doc: jsPDF, startY: number, datos: DatosSensor[], 
                              titulo: string, campo: keyof DatosSensor, unidad: string, 
                              color: [number, number, number]): number {
    // Verificar si necesitamos nueva página
    if (startY > 240) {
      doc.addPage();
      startY = 20;
    }

    // Título de sección
    doc.setFontSize(14);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(titulo, 20, startY);
    startY += 10;

    // Filtrar valores válidos y calcular estadísticas
    const valoresValidos = datos
      .map(d => d[campo] as number)
      .filter(v => v !== null && v !== undefined && !isNaN(v) && isFinite(v));

    if (valoresValidos.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('No hay datos válidos para este período', 25, startY);
      return startY + 20;
    }

    const promedio = valoresValidos.reduce((a, b) => a + b, 0) / valoresValidos.length;
    const maximo = Math.max(...valoresValidos);
    const minimo = Math.min(...valoresValidos);

    // Mostrar estadísticas
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Promedio: ${promedio.toFixed(2)}${unidad}`, 25, startY);
    doc.text(`Máximo: ${maximo.toFixed(2)}${unidad}`, 80, startY);
    doc.text(`Mínimo: ${minimo.toFixed(2)}${unidad}`, 135, startY);
    startY += 10;

    // Crear tabla con datos (solo datos válidos)
    const headers = [['Fecha', 'Hora', 'Valor', 'Dispositivo']];
    const datosValidos = datos.filter(d => this.validarDatosSensor(d, campo as string));
    
    const rows = datosValidos.slice(0, 20).map(d => [
      this.formatearFecha(d.timestamp),
      new Date(d.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      `${((d[campo] as number) || 0).toFixed(2)}${unidad}`,
      d.device?.deviceCode || 'N/A'
    ]);

    if (rows.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('No hay datos para mostrar en la tabla', 25, startY);
      return startY + 20;
    }

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: startY,
      theme: 'striped',
      headStyles: { 
        fillColor: color,
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 }
      },
      margin: { left: 25, right: 25 }
    });

    // Obtener posición Y después de la tabla
    const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
    
    return finalY + 15;
  }

  private agregarSeccionInsumos(doc: jsPDF, startY: number, insumos: Insumo[]): number {
    if (startY > 240) {
      doc.addPage();
      startY = 20;
    }

    // Título de sección
    doc.setFontSize(14);
    doc.setTextColor(255, 140, 0);
    doc.text('Insumos Utilizados', 20, startY);
    startY += 10;

    // Calcular resumen
    const costoTotal = insumos.reduce((sum, i) => sum + i.costo, 0);
    const cantidadInsumos = insumos.length;

    // Mostrar resumen
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Total de insumos: ${cantidadInsumos}`, 25, startY);
    doc.text(`Costo total: ${this.formatearMoneda(costoTotal)}`, 80, startY);
    startY += 10;

    // Crear tabla de insumos
    const headers = [['Producto', 'Cantidad', 'Fecha', 'Costo', 'Proveedor']];
    const rows = insumos.map(i => [
      i.producto,
      `${i.cantidadUsada} ${i.medida}`,
      this.formatearFecha(i.fechaDeUso),
      this.formatearMoneda(i.costo),
      i.proveedor
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: startY,
      theme: 'striped',
      headStyles: { 
        fillColor: [255, 140, 0],
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 35 }
      },
      margin: { left: 25, right: 25 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
    
    if (finalY < 220) {
      const proveedoresResumen = this.agruparPorProveedor(insumos);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('Resumen por Proveedor:', 25, finalY + 10);
      
      let tempY = finalY + 18;
      doc.setFontSize(9);
      
      Object.entries(proveedoresResumen).slice(0, 5).forEach(([proveedor, datos]) => {
        doc.text(`• ${proveedor}: ${datos.cantidad} productos - ${this.formatearMoneda(datos.costoTotal)}`, 30, tempY);
        tempY += 6;
      });
      
      return tempY + 10;
    }
    
    return finalY + 15;
  }

  private agruparPorProveedor(insumos: Insumo[]): Record<string, {cantidad: number, costoTotal: number}> {
    return insumos.reduce((acc, insumo) => {
      if (!acc[insumo.proveedor]) {
        acc[insumo.proveedor] = { cantidad: 0, costoTotal: 0 };
      }
      acc[insumo.proveedor].cantidad++;
      acc[insumo.proveedor].costoTotal += insumo.costo;
      return acc;
    }, {} as Record<string, {cantidad: number, costoTotal: number}>);
  }

  private formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  private formatearMoneda(cantidad: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(cantidad);
  }
}