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

        // Definir la fecha base de inicio del Parcial (Ejemplo: Lunes 24 de Agosto 2026)
        // Ajusta esta fecha si el cuatrimestre inicia en otro día de agosto
        const FECHA_INICIO_PARCIAL = new Date(2026, 7, 24); // 24-08-2026 (Mes 7 es Agosto)

        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');
            const genero = (alumno.genero || 'H').toUpperCase();
            const esH = genero === 'H' ? 'H' : '';
            const esM = genero === 'M' ? 'M' : '';

            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${alumno.matricula}</td>
                <td style="text-align: left; padding-left: 5px;">${alumno.nombre}</td>
                <td>${genero}</td>
            `;

            // Estructura para almacenar asistencias de las 4 sesiones
            // { 1: {jueves: false, lunes: false}, 2: {jueves: false, lunes: false}, ... }
            const sesiones = {
                1: { jueves: false, lunes: false },
                2: { jueves: false, lunes: false },
                3: { jueves: false, lunes: false },
                4: { jueves: false, lunes: false }
            };

            // 3. PROCESAR HISTORIAL DE ASISTENCIAS Y DETERMINAR LA SESIÓN DE CADA FECHA
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
                            const diaSemana = fechaRegistro.getDay(); // 1: Lun, 4: Jue

                            // Calcular diferencia de semanas desde la fecha de inicio
                            const diffTiempo = fechaRegistro.getTime() - FECHA_INICIO_PARCIAL.getTime();
                            const diffDias = Math.floor(diffTiempo / (1000 * 3600 * 24));
                            
                            // Determinar a qué número de sesión (1 a 4) corresponde la fecha
                            let numSesion = Math.floor(diffDias / 7) + 1;
                            if (numSesion < 1) numSesion = 1;
                            if (numSesion > 4) numSesion = 4;

                            // Registrar la asistencia en la sesión calculada
                            if (diaSemana === 4) sesiones[numSesion].jueves = true;
                            if (diaSemana === 1) sesiones[numSesion].lunes = true;
                        }
                    }
                });
            }

            // 4. RENDERIZAR LAS 4 SESIONES
            for (let s = 1; s <= 4; s++) {
                const dioJueves = sesiones[s].jueves;
                const dioLunes = sesiones[s].lunes;

                tr.innerHTML += `
                    <td class="bg-amarillo-dia"></td>
                    <td class="bg-amarillo-dia"></td>
                    <td class="bg-amarillo-dia"></td>
                    <td class="bg-amarillo-dia">${dioJueves ? '1' : ''}</td>
                    <td class="bg-amarillo-dia"></td>
                    <td class="bg-amarillo-dia"></td>
                    <td class="bg-amarillo-dia">${dioJueves ? esH : ''}</td>
                    <td class="bg-amarillo-dia">${dioJueves ? esM : ''}</td>
                    <td class="bg-rosa-col">${dioLunes ? '1' : ''}</td>
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
        console.error('Error al renderizar la vista de seguimiento:', error);
    }
});