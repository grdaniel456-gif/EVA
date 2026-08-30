document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // Actualizar contador total
        document.getElementById('totalEstudiantes').textContent = alumnos.length;

        // 1. Extraer Apellido Paterno para ordenar A-Z
        const obtenerApellido = (nombreCompleto) => {
            if (!nombreCompleto) return '';
            const partes = nombreCompleto.trim().split(' ');
            if (partes.length >= 3) return partes[partes.length - 2]; 
            if (partes.length === 2) return partes[1];
            return partes[0];
        };

        // Ordenar alfabéticamente A-Z por apellido
        alumnos.sort((a, b) => {
            const apellidoA = obtenerApellido(a.nombre);
            const apellidoB = obtenerApellido(b.nombre);
            return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
        });

        const cuerpoTabla = document.getElementById('cuerpoTabla');
        cuerpoTabla.innerHTML = '';

        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');

            // N°, Matrícula, Nombre, Sexo (Obtenido de BD o por defecto)
            const genero = alumno.genero || 'H';
            const esH = genero.toUpperCase() === 'H' ? 'X' : '';
            const esM = genero.toUpperCase() === 'M' ? 'X' : '';

            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${alumno.matricula}</td>
                <td style="text-align: left; padding-left: 5px;">${alumno.nombre}</td>
                <td>${genero}</td>
            `;

            // Evaluar días trabajados (Jueves = Grupal, Lunes = Individual)
            let asistioJueves = false;
            let asistioLunes = false;

            if (alumno.historial_asistencias && Array.isArray(alumno.historial_asistencias)) {
                alumno.historial_asistencias.forEach(registro => {
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const rawFecha = partes[1].trim().split('-'); // ["30", "08", "2026", "11:46"]
                        const dia = parseInt(rawFecha[0], 10);
                        const mes = parseInt(rawFecha[1], 10) - 1;
                        const anio = parseInt(rawFecha[2], 10);

                        const fechaObjeto = new Date(anio, mes, dia);
                        const diaSemana = fechaObjeto.getDay(); // 1 = Lunes, 4 = Jueves

                        if (diaSemana === 4) asistioJueves = true;
                        if (diaSemana === 1) asistioLunes = true;
                    }
                });
            }

            // --- BLOQUE DE LAS 4 SESIONES (SESIÓN 1 POBLADA CON BD, RESTO EN BLANCO) ---
            for (let s = 1; s <= 4; s++) {
                if (s === 1) {
                    // Sesión 1 activa con datos reales
                    tr.innerHTML += `
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia ${asistioJueves ? 'marca-presente' : 'marca-ausente'}">${asistioJueves ? '✔' : '✘'}</td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia">${esH}</td>
                        <td class="bg-amarillo-dia">${esM}</td>
                        <td class="bg-rosa-col ${asistioLunes ? 'marca-presente' : ''}">${asistioLunes ? '✔' : ''}</td>
                    `;
                } else {
                    // Sesiones 2, 3 y 4 en blanco preparadas para futuro uso
                    tr.innerHTML += `
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

            // COLUMNAS FINALES (Observaciones / Selects)
            tr.innerHTML += `
                <td><small>Seleccione</small></td>
                <td><small>Seleccione</small></td>
                <td></td>
            `;

            cuerpoTabla.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al renderizar el formato Excel:', error);
    }
});   

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // 1. CONTEO Y CÁLCULO DE INFORMACIÓN GENERAL
        let totalHombres = 0;
        let totalMujeres = 0;

        alumnos.forEach(alumno => {
            const genero = (alumno.genero || '').toUpperCase();
            if (genero === 'H') {
                totalHombres++;
            } else if (genero === 'M') {
                totalMujeres++;
            }
        });

        // Asignar los totales a la tabla de Información General
        document.getElementById('totalEstudiantes').textContent = alumnos.length;
        document.getElementById('totalHombres').textContent = totalHombres;
        document.getElementById('totalMujeres').textContent = totalMujeres;

        // 2. Extraer Apellido Paterno para ordenar A-Z
        const obtenerApellido = (nombreCompleto) => {
            if (!nombreCompleto) return '';
            const partes = nombreCompleto.trim().split(' ');
            if (partes.length >= 3) return partes[partes.length - 2]; 
            if (partes.length === 2) return partes[1];
            return partes[0];
        };

        // Ordenar alfabéticamente A-Z por apellido
        alumnos.sort((a, b) => {
            const apellidoA = obtenerApellido(a.nombre);
            const apellidoB = obtenerApellido(b.nombre);
            return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
        });

        const cuerpoTabla = document.getElementById('cuerpoTabla');
        cuerpoTabla.innerHTML = '';

        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');

            // Determinar marcas de género 'X' en la columna correspondiente
            const genero = (alumno.genero || 'H').toUpperCase();
            const esH = genero === 'H' ? 'X' : '';
            const esM = genero === 'M' ? 'X' : '';

            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${alumno.matricula}</td>
                <td style="text-align: left; padding-left: 5px;">${alumno.nombre}</td>
                <td>${genero}</td>
            `;

            // Evaluar días trabajados (Jueves = Grupal, Lunes = Individual)
            let asistioJueves = false;
            let asistioLunes = false;

            if (alumno.historial_asistencias && Array.isArray(alumno.historial_asistencias)) {
                alumno.historial_asistencias.forEach(registro => {
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const rawFecha = partes[1].trim().split('-'); // ["30", "08", "2026", "11:46"]
                        const dia = parseInt(rawFecha[0], 10);
                        const mes = parseInt(rawFecha[1], 10) - 1;
                        const anio = parseInt(rawFecha[2], 10);

                        const fechaObjeto = new Date(anio, mes, dia);
                        const diaSemana = fechaObjeto.getDay(); // 1 = Lunes, 4 = Jueves

                        if (diaSemana === 4) asistioJueves = true;
                        if (diaSemana === 1) asistioLunes = true;
                    }
                });
            }

            // --- BLOQUE DE LAS 4 SESIONES ---
            for (let s = 1; s <= 4; s++) {
                if (s === 1) {
                    tr.innerHTML += `
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia ${asistioJueves ? 'marca-presente' : 'marca-ausente'}">${asistioJueves ? '✔' : '✘'}</td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia"></td>
                        <td class="bg-amarillo-dia">${esH}</td>
                        <td class="bg-amarillo-dia">${esM}</td>
                        <td class="bg-rosa-col ${asistioLunes ? 'marca-presente' : ''}">${asistioLunes ? '✔' : ''}</td>
                    `;
                } else {
                    tr.innerHTML += `
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

            // COLUMNAS FINALES
            tr.innerHTML += `
                <td><small>Seleccione</small></td>
                <td><small>Seleccione</small></td>
                <td></td>
            `;

            cuerpoTabla.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al renderizar el formato Excel:', error);
    }
});