document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // 1. CONTEO DE INFORMACIÓN GENERAL
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

        // Fecha de inicio del parcial para calcular las 4 semanas/sesiones (Lunes 24 Agosto 2026)
        const FECHA_INICIO_PARCIAL = new Date(2026, 7, 24); 

        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');
            
            // Determinar Género visible para la columna principal
            const genero = String(alumno.genero || '').trim().toUpperCase();

            // Celdas fijas de información del alumno
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${alumno.matricula}</td>
                <td style="text-align: left; padding-left: 5px;">${alumno.nombre}</td>
                <td style="font-weight: bold;">${genero}</td>
            `;

            // Matriz para guardar asistencias por cada una de las 4 sesiones
            const sesiones = {
                1: { lunes: false, jueves: false },
                2: { lunes: false, jueves: false },
                3: { lunes: false, jueves: false },
                4: { lunes: false, jueves: false }
            };

            // 3. PROCESAR HISTORIAL DE ASISTENCIAS DE LA BASE DE DATOS
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
                            const diaSemana = fechaRegistro.getDay(); // 1: Lunes, 4: Jueves

                            // Calcular a qué semana / sesión pertenece la fecha
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

            // 4. GENERAR LAS 4 SESIONES
            for (let s = 1; s <= 4; s++) {
                const asistioLunes = sesiones[s].lunes;
                const asistioJueves = sesiones[s].jueves;

                tr.innerHTML += `
                    <!-- SUBCOLUMNAS DÍAS (L, M, X, J, V, S) -->
                    <td class="bg-amarillo-dia"></td> <!-- L -->
                    <td class="bg-amarillo-dia"></td> <!-- M -->
                    <td class="bg-amarillo-dia"></td> <!-- X -->
                    <td class="bg-amarillo-dia" style="font-weight: bold;">${asistioJueves ? '1' : ''}</td> <!-- J (Tutoría Grupal) -->
                    <td class="bg-amarillo-dia"></td> <!-- V -->
                    <td class="bg-amarillo-dia"></td> <!-- S -->
                    
                    <!-- SUBCOLUMNAS GÉNERO H / M -->
                    <td class="bg-amarillo-dia">${genero === 'H' ? 'H' : ''}</td>
                    <td class="bg-amarillo-dia">${genero === 'M' ? 'M' : ''}</td>
                    
                    <!-- CASILLA ROSA: ASISTENCIA INDIVIDUAL (REGISTRA LOS LUNES) -->
                    <td class="bg-rosa-col" style="font-weight: bold; text-align: center;">${asistioLunes ? '1' : ''}</td>
                `;
            }

            // COLUMNAS FINALES DE OBSERVACIONES
            tr.innerHTML += `
                <td><small>Seleccione</small></td>
                <td><small>Seleccione</small></td>
                <td></td>
            `;

            cuerpoTabla.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al renderizar el seguimiento:', error);
    }
});


// EVENTO PARA EXPORTAR A EXCEL MANTENIENDO COLORES Y BORDES
document.getElementById('btnExportarExcel').addEventListener('click', () => {
    const tabla = document.getElementById('tablaSeguimiento');
    if (!tabla) {
        alert("No se encontró la tabla para exportar.");
        return;
    }

    // 1. Clonar la tabla para inyectar estilos de color sin alterar la vista en pantalla
    const tablaClon = tabla.cloneNode(true);

    // 2. Aplicar estilos inline directo a las celdas para que Excel reconozca los colores
    tablaClon.querySelectorAll('.header-parcial').forEach(el => el.setAttribute('style', 'background-color: #d9d9d9; font-weight: bold; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.header-sesion').forEach(el => el.setAttribute('style', 'background-color: #efefef; font-weight: bold; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.header-estudiantil').forEach(el => el.setAttribute('style', 'background-color: #d9ead3; font-weight: bold; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.header-instruccion').forEach(el => el.setAttribute('style', 'background-color: #ffffff; color: #cc0000; font-size: 9px; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.bg-sub-grupal').forEach(el => el.setAttribute('style', 'background-color: #efefef; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.bg-sexo-header').forEach(el => el.setAttribute('style', 'background-color: #efefef; color: #cc0000; font-weight: bold; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.bg-rosa-header').forEach(el => el.setAttribute('style', 'background-color: #ff26a8; color: #ffffff; font-weight: bold; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.bg-asistencia-grupal').forEach(el => el.setAttribute('style', 'background-color: #efefef; color: #cc0000; font-weight: bold; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.bg-asistencia-ind').forEach(el => el.setAttribute('style', 'background-color: #ff26a8; color: #ffffff; font-weight: bold; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.bg-amarillo-dia').forEach(el => el.setAttribute('style', 'background-color: #fff2cc; border: 1px solid #000; text-align: center; font-weight: bold;'));
    tablaClon.querySelectorAll('.bg-rosa-col').forEach(el => el.setAttribute('style', 'background-color: #ff26a8; border: 1px solid #000; text-align: center; font-weight: bold; color: #ffffff;'));
    tablaClon.querySelectorAll('.col-h-m').forEach(el => el.setAttribute('style', 'background-color: #fff2cc; border: 1px solid #000; text-align: center;'));
    tablaClon.querySelectorAll('.col-obs').forEach(el => el.setAttribute('style', 'background-color: #efefef; border: 1px solid #000; text-align: center;'));

    // Bordes por defecto para celdas normales
    tablaClon.querySelectorAll('td, th').forEach(el => {
        if (!el.getAttribute('style')) {
            el.setAttribute('style', 'border: 1px solid #000000; text-align: center;');
        }
    });

    // 3. Crear el HTML compatible con Excel
    const plantillaExcel = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
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
        </head>
        <body>
            ${tablaClon.outerHTML}
        </body>
        </html>
    `;

    // 4. Generar la descarga automática
    const blob = new Blob(['\ufeff' + plantillaExcel], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Seguimiento_Academico_7A.xls';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});