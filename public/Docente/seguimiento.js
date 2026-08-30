document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/api/seguimiento');
        const alumnos = await respuesta.json();

        // 1. FUNCIÓN PARA OBTENER EL PRIMER APELLIDO
        // Para nombres como "Allison Caltitla Axilote" o "María Isabel Ramos Morales"
        const obtenerApellido = (nombreCompleto) => {
            if (!nombreCompleto) return '';
            const partes = nombreCompleto.trim().split(' ');
            if (partes.length >= 3) {
                // Asume formato: Nombre(s) + ApellidoPaterno + ApellidoMaterno
                return partes[partes.length - 2]; 
            } else if (partes.length === 2) {
                // Asume formato: Nombre + Apellido
                return partes[1];
            }
            return partes[0];
        };

        // 2. ORDENAR ALUMNOS POR APELLIDO (A-Z)
        alumnos.sort((a, b) => {
            const apellidoA = obtenerApellido(a.nombre);
            const apellidoB = obtenerApellido(b.nombre);
            return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
        });

        // 3. EXTRAER Y PROCESAR TODAS LAS FECHAS ÚNICAS
        // Convierte "asistencia 1: 30-08-2026-11:46" -> "30-08-2026"
        const conjuntoFechas = new Set();
        
        alumnos.forEach(alumno => {
            if (alumno.historial_asistencias && Array.isArray(alumno.historial_asistencias)) {
                alumno.historial_asistencias.forEach(registro => {
                    // Extrae la parte después de los dos puntos y toma solo la fecha (DD-MM-YYYY)
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const fechaHora = partes[1].trim(); // "30-08-2026-11:46"
                        const fecha = fechaHora.split('-').slice(0, 3).join('-'); // "30-08-2026"
                        conjuntoFechas.add(fecha);
                    }
                });
            }
        });

        const fechasOrdenadas = Array.from(conjuntoFechas).sort();

        // 4. CONSTRUIR CABECERA CON LAS FECHAS
        const filaEncabezado = document.getElementById('filaEncabezado');
        fechasOrdenadas.forEach(fecha => {
            const th = document.createElement('th');
            // Formatea a DD/MM
            const [dia, mes] = fecha.split('-');
            th.textContent = `${dia}/${mes}`;
            filaEncabezado.appendChild(th);
        });

        // 5. RENDERIZAR TABLA DE ALUMNOS
        const cuerpoTabla = document.getElementById('cuerpoTabla');
        cuerpoTabla.innerHTML = '';

        alumnos.forEach(alumno => {
            const tr = document.createElement('tr');

            // Columna Matrícula
            const tdMatricula = document.createElement('td');
            tdMatricula.textContent = alumno.matricula;
            tr.appendChild(tdMatricula);

            // Columna Nombre Completo
            const tdNombre = document.createElement('td');
            tdNombre.textContent = alumno.nombre;
            tr.appendChild(tdNombre);

            // Crear un Set con las fechas en las que asistiom este alumno en específico
            const fechasAlumno = new Set();
            if (alumno.historial_asistencias) {
                alumno.historial_asistencias.forEach(registro => {
                    const partes = registro.split(': ');
                    if (partes.length > 1) {
                        const fecha = partes[1].trim().split('-').slice(0, 3).join('-');
                        fechasAlumno.add(fecha);
                    }
                });
            }

            // Columnas de Asistencia por Fecha
            fechasOrdenadas.forEach(fecha => {
                const tdAsistencia = document.createElement('td');
                
                if (fechasAlumno.has(fecha)) {
                    tdAsistencia.textContent = '✔';
                    tdAsistencia.className = 'presente';
                } else {
                    tdAsistencia.textContent = '✘';
                    tdAsistencia.className = 'ausente';
                }

                tr.appendChild(tdAsistencia);
            });

            cuerpoTabla.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al cargar la tabla de seguimiento:', error);
    }
});