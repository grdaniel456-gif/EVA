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