document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // 1. CONTEO DE HOMBRES Y MUJERES PARA INFORMACIÓN GENERAL
        let totalHombres = 0;
        let totalMujeres = 0;

        alumnos.forEach(alumno => {
            const generoLimpio = String(alumno.genero || '').trim().toUpperCase();
            if (generoLimpio === 'H') {
                totalHombres++;
            } else if (generoLimpio === 'M') {
                totalMujeres++;
            }
        });

        document.getElementById('totalEstudiantes').textContent = alumnos.length;
        document.getElementById('totalHombres').textContent = totalHombres;
        document.getElementById('totalMujeres').textContent = totalMujeres;

        // 2. EXTRAER APELLIDO PATERNO Y ORDENAR A-Z
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
        if (!cuerpoTabla) return;
        cuerpoTabla.innerHTML = '';

        // 3. RENDERIZAR FILAS CON ESTILOS Y ESTRUCTURA DE EXCEL
        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');

            const generoLimpio = String(alumno.genero || '').trim().toUpperCase();
            const esH = generoLimpio === 'H' ? '1' : '';
            const esM = generoLimpio === 'M' ? '1' : '';

            // EVALUAR ASISTENCIAS DESDE BD
            let asistioJueves = false;
            let asistioLunes = false;

            if (alumno.historial_asistencias && Array.isArray(alumno.historial_asistencias)) {
                alumno.historial_asistencias.forEach(registro => {
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const subpartes = partes[1].trim().split('-');
                        if (subpartes.length >= 3) {
                            const dia = parseInt(subpartes[0], 10);
                            const mes = parseInt(subpartes[1], 10) - 1;
                            const anio = parseInt(subpartes[2], 10);

                            const fechaObjeto = new Date(anio, mes, dia);
                            const diaSemana = fechaObjeto.getDay();

                            if (diaSemana === 4) asistioJueves = true;
                            if (diaSemana === 1) asistioLunes = true;
                        }
                    }
                });
            }

            // BLOQUE 1: DATOS FIJOS ALUMNO (VERDE)
            let htmlFila = `
                <td class="bg-verde">${i + 1}</td>
                <td class="bg-verde">${alumno.matricula}</td>
                <td class="bg-verde" style="text-align: left; padding-left: 5px;">${alumno.nombre}</td>
                <td class="bg-verde">${generoLimpio}</td>
            `;

            // BLOQUE 2: LAS 4 SESIONES
            for (let s = 1; s <= 4; s++) {
                if (s === 1) {
                    htmlFila += `
                        <td class="bg-amarillo-dia"></td> <!-- L -->
                        <td class="bg-amarillo-dia"></td> <!-- M -->
                        <td class="bg-amarillo-dia"></td> <!-- X -->
                        <td class="bg-amarillo-dia" style="font-weight: bold;">${asistioJueves ? '1' : ''}</td> <!-- J -->
                        <td class="bg-amarillo-dia"></td> <!-- V -->
                        <td class="bg-amarillo-dia"></td> <!-- S -->
                        <td class="bg-amarillo-dia">${esH}</td> <!-- H -->
                        <td class="bg-amarillo-dia">${esM}</td> <!-- M -->
                        <td class="bg-rosa-col" style="font-weight: bold;">${asistioLunes ? '1' : ''}</td> <!-- Rosa Magenta -->
                    `;
                } else {
                    htmlFila += `
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-rosa-col"></td>
                    `;
                }
            }

            // BLOQUE 3: OBSERVACIONES
            htmlFila += `
                <td><small>Seleccione</small></td>
                <td><small>Seleccione</small></td>
                <td></td>
            `;

            tr.innerHTML = htmlFila;
            cuerpoTabla.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al renderizar la tabla:', error);
    }
});