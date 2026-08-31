document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // 1. CONTEO DE HOMBRES Y MUJERES
        let totalHombres = 0;
        let totalMujeres = 0;

        alumnos.forEach(alumno => {
            const genero = (alumno.genero || '').toUpperCase();
            if (genero === 'H') totalHombres++;
            else if (genero === 'M') totalMujeres++;
        });

        document.getElementById('totalEstudiantes').textContent = alumnos.length;
        document.getElementById('totalHombres').textContent = totalHombres;
        document.getElementById('totalMujeres').textContent = totalMujeres;

        // 2. ORDENAR A-Z POR APELLIDO
        const obtenerApellido = (nombreCompleto) => {
            if (!nombreCompleto) return '';
            const partes = nombreCompleto.trim().split(' ');
            if (partes.length >= 3) return partes[partes.length - 2]; 
            if (partes.length === 2) return partes[1];
            return partes[0];
        };

        alumnos.sort((a, b) => {
            const apellidoA = obtenerApellido(a.nombre);
            const apellidoB = obtenerApellido(b.nombre);
            return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
        });

        const cuerpoTabla = document.getElementById('cuerpoTabla');
        cuerpoTabla.innerHTML = '';

        const FECHA_INICIO_PARCIAL = new Date(2026, 7, 24); 

        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');
            const genero = String(alumno.genero || '').trim().toUpperCase();

            tr.innerHTML = `
                <td style="border: 1px solid #000; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; text-align: center;">${alumno.matricula}</td>
                <td style="border: 1px solid #000; text-align: left; padding-left: 5px;">${alumno.nombre}</td>
                <td style="border: 1px solid #000; text-align: center; font-weight: bold;">${genero}</td>
            `;

            const sesiones = {
                1: { lunes: false, jueves: false },
                2: { lunes: false, jueves: false },
                3: { lunes: false, jueves: false },
                4: { lunes: false, jueves: false }
            };

            if (alumno.historial_asistencias && Array.isArray(alumno.historial_asistencias)) {
                alumno.historial_asistencias.forEach(registro => {
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const fechaHoraStr = partes[1].trim();
                        const match = fechaHoraStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
                        
                        if (match) {
                            const dia = parseInt(match[1], 10);
                            const mes = parseInt(match[2], 10) - 1;
                            const anio = parseInt(match[3], 10);

                            const fechaRegistro = new Date(anio, mes, dia);
                            const diaSemana = fechaRegistro.getDay(); 

                            const diffTiempo = fechaRegistro.getTime() - FECHA_INICIO_PARCIAL.getTime();
                            const diffDias = Math.floor(diffTiempo / (1000 * 3600 * 24));
                            
                            let numSesion = Math.floor(diffDias / 7) + 1;
                            if (numSesion < 1) numSesion = 1;
                            if (numSesion > 4) numSesion = 4;

                            if (diaSemana === 1) sesiones[numSesion].lunes = true;
                            if (diaSemana === 4) sesiones[numSesion].jueves = true;
                        }
                    }
                });
            }

            // RENDERIZAR LAS 4 SESIONES EN PANTALLA
            for (let s = 1; s <= 4; s++) {
                const asistioLunes = sesiones[s].lunes;
                const asistioJueves = sesiones[s].jueves;

                tr.innerHTML += `
                    <td class="celda-amarilla" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    <td class="celda-amarilla" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    <td class="celda-amarilla" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    <td class="celda-amarilla" style="background-color: #fff2cc; border: 1px solid #000; text-align: center; font-weight: bold;">${asistioJueves ? '1' : ''}</td>
                    <td class="celda-amarilla" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    <td class="celda-amarilla" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    
                    <td class="celda-amarilla" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;">${genero === 'H' ? 'H' : ''}</td>
                    <td class="celda-amarilla" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;">${genero === 'M' ? 'M' : ''}</td>
                    
                    <td class="celda-rosa" style="background-color: #ff26a8; color: #ffffff; border: 1px solid #000; text-align: center; font-weight: bold;">${asistioLunes ? '1' : ''}</td>
                `;
            }

            tr.innerHTML += `
                <td style="border: 1px solid #000; text-align: center;"><small>Seleccione</small></td>
                <td style="border: 1px solid #000; text-align: center;"><small>Seleccione</small></td>
                <td style="border: 1px solid #000; text-align: center;"></td>
            `;

            cuerpoTabla.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al renderizar el seguimiento:', error);
    }
});


// EXPORTACIÓN A EXCEL / LIBREOFFICE CON BORDES NATIVOS Y COLORES FORZADOS
document.getElementById('btnExportarExcel').addEventListener('click', () => {
    const tablaSeguimiento = document.getElementById('tablaSeguimiento');
    if (!tablaSeguimiento) {
        alert("No se encontró la tabla de seguimiento.");
        return;
    }

    // 1. Clonar la tabla HTML
    const clon = tablaSeguimiento.cloneNode(true);
    clon.setAttribute('border', '1');

    // 2. RECORRER ABSOLUTAMENTE TODAS LAS CELDAS DE LA TABLA Y APLICAR ATRIBUTOS DIRECTOS NATIVOS
    const filas = clon.querySelectorAll('tr');
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll('th, td');
        celdas.forEach(celda => {
            // Asignar bordes negros obligatorios en HTML
            celda.setAttribute('border', '1');
            celda.style.border = '1px solid #000000';
            celda.style.verticalAlign = 'middle';

            // Detectar y forzar colores por atributos nativos de HTML (compatibles 100% con LibreOffice)
            const estilo = celda.getAttribute('style') || '';
            const clase = celda.className || '';

            if (estilo.includes('#fff2cc') || clase.includes('celda-amarilla') || clase.includes('bg-amarillo-dia') || clase.includes('col-h-m')) {
                celda.setAttribute('bgcolor', '#FFF2CC');
                celda.style.backgroundColor = '#FFF2CC';
            } else if (estilo.includes('#ff26a8') || clase.includes('celda-rosa') || clase.includes('bg-rosa-col') || clase.includes('bg-rosa-header') || clase.includes('bg-asistencia-ind')) {
                celda.setAttribute('bgcolor', '#FF26A8');
                celda.style.backgroundColor = '#FF26A8';
                celda.style.color = '#FFFFFF';
            } else if (clase.includes('header-parcial')) {
                celda.setAttribute('bgcolor', '#D9D9D9');
                celda.style.backgroundColor = '#D9D9D9';
            } else if (clase.includes('header-estudiantil')) {
                celda.setAttribute('bgcolor', '#D9EAD3');
                celda.style.backgroundColor = '#D9EAD3';
            } else if (clase.includes('header-sesion') || clase.includes('bg-sub-grupal') || clase.includes('bg-sexo-header')) {
                celda.setAttribute('bgcolor', '#EFEFEF');
                celda.style.backgroundColor = '#EFEFEF';
            }
        });
    });

    // 3. ESTRUCTURA COMPATIBLE
    const contenidoExcel = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Seguimiento Académico</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; }
                td, th { border: 1px solid #000000 !important; text-align: center; vertical-align: middle; }
            </style>
        </head>
        <body>
            ${clon.outerHTML}
        </body>
        </html>
    `;

    // 4. DESCARGAR ARVO XLS
    const blob = new Blob(['\ufeff', contenidoExcel], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Seguimiento_Academico_7A.xls';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});