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

        const elEstudiantes = document.getElementById('totalEstudiantes');
        const elHombres = document.getElementById('totalHombres');
        const elMujeres = document.getElementById('totalMujeres');

        if (elEstudiantes) elEstudiantes.textContent = alumnos.length;
        if (elHombres) elHombres.textContent = totalHombres;
        if (elMujeres) elMujeres.textContent = totalMujeres;

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
        if (cuerpoTabla) {
            cuerpoTabla.innerHTML = '';

            const FECHA_INICIO_PARCIAL = new Date(2026, 7, 24); 

            alumnos.forEach((alumno, i) => {
                const tr = document.createElement('tr');
                const genero = String(alumno.genero || '').trim().toUpperCase();

                tr.innerHTML = `
                    <td style="border: 1px solid #000; text-align: center; background-color: #ffffff;">${i + 1}</td>
                    <td style="border: 1px solid #000; text-align: center; background-color: #ffffff;">${alumno.matricula}</td>
                    <td style="border: 1px solid #000; text-align: left; padding-left: 5px; background-color: #ffffff;">${alumno.nombre}</td>
                    <td style="border: 1px solid #000; text-align: center; font-weight: bold; background-color: #ffffff;">${genero}</td>
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

                for (let s = 1; s <= 4; s++) {
                    const asistioLunes = sesiones[s].lunes;
                    const asistioJueves = sesiones[s].jueves;

                    tr.innerHTML += `
                        <td class="bg-amarillo-dia" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                        <td class="bg-amarillo-dia" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                        <td class="bg-amarillo-dia" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                        <td class="bg-amarillo-dia" style="background-color: #fff2cc; border: 1px solid #000; text-align: center; font-weight: bold;">${asistioJueves ? '1' : ''}</td>
                        <td class="bg-amarillo-dia" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                        <td class="bg-amarillo-dia" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;"></td>
                        
                        <td class="col-h-m" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;">${genero === 'H' ? 'H' : ''}</td>
                        <td class="col-h-m" style="background-color: #fff2cc; border: 1px solid #000; text-align: center;">${genero === 'M' ? 'M' : ''}</td>
                        
                        <td class="bg-rosa-col" style="background-color: #ff26a8; color: #ffffff; border: 1px solid #000; text-align: center; font-weight: bold;">${asistioLunes ? '1' : ''}</td>
                    `;
                }

                tr.innerHTML += `
                    <td style="border: 1px solid #000; text-align: center; background-color: #ffffff;"><small>Seleccione</small></td>
                    <td style="border: 1px solid #000; text-align: center; background-color: #ffffff;"><small>Seleccione</small></td>
                    <td style="border: 1px solid #000; text-align: center; background-color: #ffffff;"></td>
                `;

                cuerpoTabla.appendChild(tr);
            });
        }

    } catch (error) {
        console.error('Error al renderizar el seguimiento:', error);
    }
});


// EXPORTADOR NATIVO A EXCEL (.XLSX) CON COLORES Y BORDES PERFECTOS
const btnExportar = document.getElementById('btnExportarExcel');
if (btnExportar) {
    btnExportar.addEventListener('click', () => {
        // 1. Crear un libro de trabajo nuevo
        const wb = XLSX.utils.book_new();

        // 2. Extraer los datos reales del DOM
        const tablaInfo = document.querySelector('.tabla-info');
        const tablaSeguimiento = document.getElementById('tablaSeguimiento');

        // Convertir la tabla 2 de seguimiento directamente a matriz de datos de SheetJS
        const wsSeguimiento = XLSX.utils.table_to_sheet(tablaSeguimiento);

        // 3. DEFINIR ANCHOS DE COLUMNA EXPLICITOS (¡Así NUNCA se apretará ningún texto!)
        const anchosColumna = [
            { wch: 4 },  // N°
            { wch: 12 }, // Matrícula
            { wch: 35 }, // Nombre del alumno (Espacio de sobra para nombres largos)
            { wch: 6 }   // Sexo
        ];

        // Añadir anchos para las 36 columnas restantes de asistencias y observaciones
        for (let i = 0; i < 36; i++) {
            anchosColumna.push({ wch: 4 });
        }
        anchosColumna.push({ wch: 25 }, { wch: 25 }, { wch: 25 }); // Columnas finales de observaciones
        wsSeguimiento['!cols'] = anchosColumna;

        // 4. APLICAR PALETA DE ESTILOS A LAS CELDAS DE SEGUIMIENTO
        const rango = XLSX.utils.decode_range(wsSeguimiento['!ref']);

        for (let R = rango.s.r; R <= rango.e.r; ++R) {
            for (let C = rango.s.c; C <= rango.e.c; ++C) {
                const celdaRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (!wsSeguimiento[celdaRef]) continue;

                // Estilo base con borde delgado negro por defecto en todas las celdas
                const estiloCelda = {
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    },
                    alignment: { vertical: "center", horizontal: "center" },
                    font: { name: "Arial", sz: 9 }
                };

                // Formatear Encabezados según la Fila R
                if (R === 0) { // Primer Parcial
                    estiloCelda.fill = { fgColor: { rgb: "D9D9D9" } };
                    estiloCelda.font = { bold: true, sz: 11 };
                } else if (R === 1) { // Sesiones e Información Estudiantil
                    if (C < 4) {
                        estiloCelda.fill = { fgColor: { rgb: "D9EAD3" } };
                    } else {
                        estiloCelda.fill = { fgColor: { rgb: "D9D9D9" } };
                    }
                    estiloCelda.font = { bold: true };
                } else if (R === 2) { // Texto de instrucciones
                    estiloCelda.font = { color: { rgb: "CC0000" }, bold: true };
                } else if (R === 4) { // Días / H / M
                    estiloCelda.fill = { fgColor: { rgb: "FFF2CC" } };
                }

                wsSeguimiento[celdaRef].s = estiloCelda;
            }
        }

        // 5. CONSTRUIR HOJA DE INFORMACIÓN GENERAL DE FORMA LIMPIA
        const datosInfo = [
            ["1. INFORMACIÓN GENERAL", ""],
            ["Periodo:", "Agosto - Diciembre 2026"],
            ["División:", "Ing. Industrial"],
            ["Persona Tutora:", "Anselmo Charros Tlapalcoyoa"],
            ["Semestre y grupo:", "7º \"A\""],
            ["No. Total de estudiantes:", document.getElementById('totalEstudiantes')?.textContent || "0"],
            ["Hombres:", document.getElementById('totalHombres')?.textContent || "0"],
            ["Mujeres:", document.getElementById('totalMujeres')?.textContent || "0"]
        ];

        const wsInfo = XLSX.utils.aoa_to_sheet(datosInfo);
        
        // Asignar anchos amplios para la Tabla 1
        wsInfo['!cols'] = [{ wch: 24 }, { wch: 38 }];
        wsInfo['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]; // Combinar Encabezado

        // Estilos para la Tabla 1
        for (let R = 0; R < datosInfo.length; R++) {
            for (let C = 0; C < 2; C++) {
                const ref = XLSX.utils.encode_cell({ r: R, c: C });
                if (!wsInfo[ref]) continue;

                if (R === 0) {
                    wsInfo[ref].s = {
                        fill: { fgColor: { rgb: "D9EAD3" } },
                        font: { bold: true, sz: 11 },
                        border: {
                            top: { style: "thin", color: { rgb: "000000" } },
                            bottom: { style: "thin", color: { rgb: "000000" } },
                            left: { style: "thin", color: { rgb: "000000" } },
                            right: { style: "thin", color: { rgb: "000000" } }
                        }
                    };
                } else {
                    wsInfo[ref].s = {
                        fill: { fgColor: { rgb: C === 0 ? "F3F3F3" : "FFFFFF" } },
                        font: { bold: C === 0 },
                        border: {
                            top: { style: "thin", color: { rgb: "000000" } },
                            bottom: { style: "thin", color: { rgb: "000000" } },
                            left: { style: "thin", color: { rgb: "000000" } },
                            right: { style: "thin", color: { rgb: "000000" } }
                        }
                    };
                }
            }
        }

        // 6. Añadir ambas hojas al libro y descargar `.xlsx` nativo
        XLSX.utils.book_append_sheet(wb, wsInfo, "Información General");
        XLSX.utils.book_append_sheet(wb, wsSeguimiento, "Seguimiento Académico");

        XLSX.writeFile(wb, 'Seguimiento_Academico_7A.xlsx');
    });
}