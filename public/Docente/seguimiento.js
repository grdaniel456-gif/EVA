document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // 1. CONTEO DE HOMBRES Y MUJERES PARA EL BLOQUE DE INFORMACIÓN GENERAL
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

        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');

            // EVALUAR ASISTENCIAS DESDE LA BASE DE DATOS
            let asistioJueves = false;
            let asistioLunes = false;

            if (alumno.historial_asistencias && Array.isArray(alumno.historial_asistencias)) {
                alumno.historial_asistencias.forEach(registro => {
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const subpartes = partes[1].trim().split('-'); // ["30", "08", "2026", "11:46"]
                        if (subpartes.length >= 3) {
                            const dia = parseInt(subpartes[0], 10);
                            const mes = parseInt(subpartes[1], 10) - 1;
                            const anio = parseInt(subpartes[2], 10);

                            const fechaObjeto = new Date(anio, mes, dia);
                            const diaSemana = fechaObjeto.getDay(); // 1 = Lunes, 4 = Jueves

                            if (diaSemana === 4) asistioJueves = true;
                            if (diaSemana === 1) asistioLunes = true;
                        }
                    }
                });
            }

            // --- BLOQUE 1: DATOS FIJOS DEL ALUMNO (5 COLUMNAS) ---
            // N° | MATRÍCULA | NOMBRE | SEXO H (BLANCO) | SEXO M (BLANCO)
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${alumno.matricula}</td>
                <td style="text-align: left; padding-left: 5px;">${alumno.nombre}</td>
                <td></td> <!-- Sexo H en blanco -->
                <td></td> <!-- Sexo M en blanco -->
            `;

            // --- BLOQUE 2: LAS 4 SESIONES DINÁMICAS (9 COLUMNAS POR SESIÓN) ---
            for (let s = 1; s <= 4; s++) {
                if (s === 1) {
                    // SESIÓN 1
                    tr.innerHTML += `
                        <!-- 1. FECHA INDIVIDUAL -->
                        <td></td>
                        
                        <!-- 2. ASISTENCIA INDIVIDUAL (COLUMNA ROSA) -> Pone '1' si asistió el Lunes -->
                        <td class="bg-rosa-col" style="font-weight: bold;">${asistioLunes ? '1' : ''}</td>
                        
                        <!-- 3. FECHA GRUPAL -->
                        <td></td>
                        
                        <!-- 4 a 9. DÍAS DE ASISTENCIA GRUPAL (L, M, X=Miércoles, J, V, S) -->
                        <td></td> <!-- L (Lunes) -->
                        <td></td> <!-- M (Martes) -->
                        <td></td> <!-- X (Miércoles - SIN PINTAR DE ROSA) -->
                        <td style="font-weight: bold;">${asistioJueves ? '1' : ''}</td> <!-- J (Jueves) -->
                        <td></td> <!-- V (Viernes) -->
                        <td></td> <!-- S (Sábado) -->
                    `;
                } else {
                    // SESIONES 2, 3 Y 4 EN BLANCO
                    tr.innerHTML += `
                        <td></td>
                        <td class="bg-rosa-col"></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    `;
                }
            }

            // --- BLOQUE 3: COLUMNAS FINALES DE OBSERVACIONES ---
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