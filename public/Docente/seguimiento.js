document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // 1. CONTEO EXACTO DE HOMBRES Y MUJERES
        let contadorHombres = 0;
        let contadorMujeres = 0;

        alumnos.forEach(alumno => {
            // Limpiamos espacios y convertimos a mayúscula por seguridad
            const generoLimpio = String(alumno.genero || '').trim().toUpperCase();
            
            if (generoLimpio === 'H') {
                contadorHombres++;
            } else if (generoLimpio === 'M') {
                contadorMujeres++;
            }
        });

        // Escribir los resultados en las celdas de Información General
        const elemTotal = document.getElementById('totalEstudiantes');
        const elemHombres = document.getElementById('totalHombres');
        const elemMujeres = document.getElementById('totalMujeres');

        if (elemTotal) elemTotal.textContent = alumnos.length;
        if (elemHombres) elemHombres.textContent = contadorHombres;
        if (elemMujeres) elemMujeres.textContent = contadorMujeres;

        // 2. EXTRAER APELLIDO PATERNO PARA ORDENAR A-Z
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
        if (!cuerpoTabla) return;
        cuerpoTabla.innerHTML = '';

        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');

            // Formatear marcas H / M para la fila individual
            const gen = String(alumno.genero || 'H').trim().toUpperCase();
            const marcaH = gen === 'H' ? 'X' : '';
            const marcaM = gen === 'M' ? 'X' : '';

            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${alumno.matricula}</td>
                <td style="text-align: left; padding-left: 5px;">${alumno.nombre}</td>
                <td>${gen}</td>
            `;

            // Evaluar días trabajados (Jueves = Grupal, Lunes = Individual)
            let asistioJueves = false;
            let asistioLunes = false;

            if (alumno.historial_asistencias && Array.isArray(alumno.historial_asistencias)) {
                alumno.historial_asistencias.forEach(registro => {
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const subpartes = partes[1].trim().split('-'); // ["30", "08", "2026", "11:46"]
                        if (subpartes.length >= 3) {
                            const dia = parseInt(subpartes[0], 10);
                            const mes = parseInt(subpartes[1], 10) - 1; // Mes base 0 en JS
                            const anio = parseInt(subpartes[2], 10);

                            const fechaObjeto = new Date(anio, mes, dia);
                            const diaSemana = fechaObjeto.getDay(); // 1 = Lunes, 4 = Jueves

                            if (diaSemana === 4) asistioJueves = true;
                            if (diaSemana === 1) asistioLunes = true;
                        }
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
                        <td class="bg-amarillo-dia">${marcaH}</td>
                        <td class="bg-amarillo-dia">${marcaM}</td>
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
        console.error('Error al calcular contadores y renderizar seguimiento:', error);
    }
});