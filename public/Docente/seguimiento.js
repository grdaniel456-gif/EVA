document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // 1. Extraer Apellido Paterno para ordenar A-Z
        const obtenerApellido = (nombreCompleto) => {
            if (!nombreCompleto) return '';
            const partes = nombreCompleto.trim().split(' ');
            if (partes.length >= 3) return partes[partes.length - 2]; 
            if (partes.length === 2) return partes[1];
            return partes[0];
        };

        // Ordenar alfabéticamente
        alumnos.sort((a, b) => {
            const apellidoA = obtenerApellido(a.nombre);
            const apellidoB = obtenerApellido(b.nombre);
            return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
        });

        const cuerpoTabla = document.getElementById('cuerpoSeguimiento');
        cuerpoTabla.innerHTML = '';

        alumnos.forEach((alumno, i) => {
            const tr = document.createElement('tr');

            // N°, Matrícula, Nombre
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${alumno.matricula}</td>
                <td class="text-left">${alumno.nombre}</td>
            `;

            // Evaluar asistencias por tipo de día (Lunes/Jueves)
            let asistioJueves = false; // Grupal
            let asistioLunes = false;  // Individual

            if (alumno.historial_asistencias && Array.isArray(alumno.historial_asistencias)) {
                alumno.historial_asistencias.forEach(registro => {
                    // Formato en BD: "asistencia 1: 30-08-2026-11:46"[cite: 2]
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const rawFecha = partes[1].trim().split('-'); // ["30", "08", "2026", "11:46"]
                        const dia = parseInt(rawFecha[0], 10);
                        const mes = parseInt(rawFecha[1], 10) - 1; // Meses en JS inician en 0
                        const anio = parseInt(rawFecha[2], 10);

                        const fechaObjeto = new Date(anio, mes, dia);
                        const diaSemana = fechaObjeto.getDay(); // 1 = Lunes, 4 = Jueves

                        if (diaSemana === 4) asistioJueves = true;
                        if (diaSemana === 1) asistioLunes = true;
                    }
                });
            }

            // --- BLOQUE GRUPAL (L, M, X, J, V, S) ---
            tr.innerHTML += `
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td class="${asistioJueves ? 'presente' : 'ausente'}">${asistioJueves ? '✔' : '✘'}</td>
                <td>-</td>
                <td>-</td>
            `;

            // --- BLOQUE INDIVIDUAL (L, M, X, J, V, S) ---
            tr.innerHTML += `
                <td class="${asistioLunes ? 'presente' : 'ausente'}">${asistioLunes ? '✔' : '✘'}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td><small>${asistioLunes ? 'Atendido individualmente' : 'Sin sesión'}</small></td>
            `;

            cuerpoTabla.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al generar plantilla de asistencias:', error);
    }
});