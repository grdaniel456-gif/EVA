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

        // Lunes 24 Agosto 2026 (Semana 1)
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

            // RENDERIZAR LAS 4 SESIONES CON ESTILOS DE COLOR DIRECTOS (INLINE)
            for (let s = 1; s <= 4; s++) {
                const asistioLunes = sesiones[s].lunes;
                const asistioJueves = sesiones[s].jueves;

                tr.innerHTML += `
                    <!-- SUBCOLUMNAS DÍAS (AMARILLO PASTEL #FFF2CC) -->
                    <td style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    <td style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    <td style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    <td style="background-color: #fff2cc; border: 1px solid #000; text-align: center; font-weight: bold;">${asistioJueves ? '1' : ''}</td>
                    <td style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    <td style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                    
                    <!-- SUBCOLUMNAS GÉNERO H / M -->
                    <td style="background-color: #fff2cc; border: 1px solid #000; text-align: center;">${genero === 'H' ? 'H' : ''}</td>
                    <td style="background-color: #fff2cc; border: 1px solid #000; text-align: center;">${genero === 'M' ? 'M' : ''}</td>
                    
                    <!-- CASILLA ROSA (#FF26A8) -->
                    <td style="background-color: #ff26a8; color: #ffffff; border: 1px solid #000; text-align: center; font-weight: bold;">${asistioLunes ? '1' : ''}</td>
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


/// EVENTO FINAL DE EXPORTACIÓN (PINTA TODAS LAS FILAS DE LA TABLA EN EXCEL / LIBREOFFICE)
document.getElementById('btnExportarExcel').addEventListener('click', () => {
    const tabla = document.getElementById('tablaSeguimiento');
    if (!tabla) {
        alert("No se encontró la tabla para exportar.");
        return;
    }

    // 1. Clonar la tabla HTML completa
    const tablaClon = tabla.cloneNode(true);

    // 2. PINTE OBLIGATORIO DE ENCABEZADOS
    tablaClon.querySelectorAll('.header-parcial').forEach(el => el.setAttribute('bgcolor', '#D9D9D9'));
    tablaClon.querySelectorAll('.header-sesion').forEach(el => el.setAttribute('bgcolor', '#EFEFEF'));
    tablaClon.querySelectorAll('.header-estudiantil').forEach(el => el.setAttribute('bgcolor', '#D9EAD3'));
    tablaClon.querySelectorAll('.bg-sub-grupal, .bg-sexo-header, .col-obs').forEach(el => el.setAttribute('bgcolor', '#EFEFEF'));
    tablaClon.querySelectorAll('.bg-rosa-header, .bg-asistencia-ind').forEach(el => {
        el.setAttribute('bgcolor', '#FF26A8');
        el.style.color = '#FFFFFF';
    });

    // 3. RECORRER TODAS LAS FILAS Y CELDAS DEL CUERPO (TBODY) PARA PINTAR CADA ALUMNO
    const filas = tablaClon.querySelectorAll('tbody tr');
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll('td');
        celdas.forEach(celda => {
            // Pintar celdas amarillas (Días L, M, X, J, V, S y Sexo)
            if (celda.classList.contains('bg-amarillo-dia') || celda.classList.contains('col-h-m')) {
                celda.setAttribute('bgcolor', '#FFF2CC');
                celda.style.backgroundColor = '#FFF2CC';
            }
            // Pintar celdas rosas (Asistencia Individual Lunes)
            else if (celda.classList.contains('bg-rosa-col')) {
                celda.setAttribute('bgcolor', '#FF26A8');
                celda.style.backgroundColor = '#FF26A8';
                celda.style.color = '#FFFFFF';
            }
            // Bordes y alineación básica para todas las celdas de alumnos
            celda.setAttribute('border', '1');
            celda.style.border = '1px solid #000000';
            celda.style.textAlign = 'center';
            celda.style.verticalAlign = 'middle';
        });
    });

    // 4. ESTRUCTURA COMPATIBLE CON LIBREOFFICE CALC Y EXCEL
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
                table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
                td, th { border: 1px solid #000000; text-align: center; vertical-align: middle; }
                .bg-amarillo-dia { background-color: #FFF2CC !important; }
                .bg-rosa-col { background-color: #FF26A8 !important; color: #FFFFFF !important; }
            </style>
        </head>
        <body>
            ${tablaClon.outerHTML}
        </body>
        </html>
    `;

    // 5. Descarga automática en formato .xls
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