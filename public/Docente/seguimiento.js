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


// EXPORTADOR NATIVO A EXCEL (.XLSX) CON COLORES EXACTOS Y BORDES FORZADOS A TODOS LOS RANGOS
const btnExportar = document.getElementById('btnExportarExcel');
if (btnExportar) {
    btnExportar.addEventListener('click', () => {
        const wb = XLSX.utils.book_new();

        // 1. OBTENER LA TABLA DE SEGUIMIENTO CONVERTIDA A HOJA
        const tablaSeguimiento = document.getElementById('tablaSeguimiento');
        const wsSeguimiento = XLSX.utils.table_to_sheet(tablaSeguimiento);

        // 2. DEFINIR ANCHOS EXACTOS DE COLUMNAS (Para evitar textos encima de otros)
        const anchosColumna = [
            { wch: 4 },  // N°
            { wch: 12 }, // MATRÍCULA
            { wch: 30 }, // NOMBRE DEL ALUMNO
            { wch: 6 }   // SEXO
        ];

        // Anchos para las 4 sesiones (9 columnas por sesión = 36 cols en total)
        for (let s = 0; s < 4; s++) {
            anchosColumna.push(
                { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 }, // L, M, X, J, V, S
                { wch: 4 }, { wch: 4 }, // H, M
                { wch: 14 } // ASISTENCIA INDIVIDUAL (Columna Rosa)
            );
        }
        // Columnas de observaciones
        anchosColumna.push({ wch: 20 }, { wch: 20 }, { wch: 20 });
        wsSeguimiento['!cols'] = anchosColumna;

        // 3. RECUPERAR EL RANGO Y FORZAR ANCHO HASTA 'AQ' (ÍNDICE 42) Y FILAS TOTALES (+6)
        const rango = XLSX.utils.decode_range(wsSeguimiento['!ref']);
        
        // Contamos cuántos alumnos hay registrados en el DOM/Tabla para asegurar las filas de la cuadrícula
        const filasAlumnos = tablaSeguimiento.querySelectorAll('tbody tr').length || 10;
        const totalFilasSeguimiento = filasAlumnos + 6; // 6 filas de cabecera + filas de alumnos

        // Forzamos el rango máximo
        const maxColumnaAQ = 42; // AQ es la columna índice 42
        rango.e.c = Math.max(rango.e.c, maxColumnaAQ);
        rango.e.r = Math.max(rango.e.r, totalFilasSeguimiento - 1);

        // Color amarillo pastel de fondo exactamente como la primera imagen (#FFF2CC)
        const COLOR_AMARILLO_PASTEL = "FFF2CC";
        const COLOR_ROSA_CHILLON = "FF26A8";
        const COLOR_VERDE_HEADER = "D9EAD3";
        const COLOR_GRIS_HEADER = "D9D9D9";
        const COLOR_GRIS_SUB = "EFEFEF";

        for (let R = rango.s.r; R <= rango.e.r; ++R) {
            for (let C = rango.s.c; C <= rango.e.c; ++C) {
                const celdaRef = XLSX.utils.encode_cell({ r: R, c: C });
                
                // Forzamos la creación explícita de celdas vacías en todo el rango A1:AQ(alumnos+6)
                if (!wsSeguimiento[celdaRef]) {
                    wsSeguimiento[celdaRef] = { t: 's', v: '' };
                }

                const celda = wsSeguimiento[celdaRef];

                // BORDES FINOS NEGROS OBLIGATORIOS PARA ABSOLUTAMENTE TODAS LAS CELDAS
                const estiloBase = {
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    },
                    alignment: { vertical: "center", horizontal: "center" },
                    font: { name: "Arial", sz: 8 }
                };

                // DETERMINE SI LA COLUMNA ES LA DE "ASISTENCIA INDIVIDUAL" (ROSA)
                // Ocurre en la columna 12, 21, 30 y 39 (índices en JS: 12, 21, 30, 39)
                const esColumnaRosa = (C >= 4 && (C - 4) % 9 === 8);

                // --- COLOREADO POR SECCIONES Y CABECERAS ---
                if (R === 0) { // Fila 1: PRIMER PARCIAL
                    estiloBase.fill = { fgColor: { rgb: C < 4 ? COLOR_VERDE_HEADER : COLOR_GRIS_HEADER } };
                    estiloBase.font = { bold: true, sz: 10 };
                } 
                else if (R === 1) { // Fila 2: SESIONES
                    estiloBase.fill = { fgColor: { rgb: C < 4 ? COLOR_VERDE_HEADER : COLOR_GRIS_HEADER } };
                    estiloBase.font = { bold: true, color: { rgb: (C >= 4 && !esColumnaRosa) ? "CC0000" : "000000" } };
                } 
                else if (R === 2) { // Fila 3: Instrucciones en rojo
                    if (C < 4) {
                        estiloBase.fill = { fgColor: { rgb: COLOR_VERDE_HEADER } };
                        estiloBase.font = { bold: true };
                    } else {
                        estiloBase.fill = { fgColor: { rgb: "FFFFFF" } };
                        estiloBase.font = { color: { rgb: "CC0000" }, sz: 7, bold: true };
                    }
                } 
                else if (R === 3) { // Fila 4: FECHA GRUPAL / SEXO / FECHA INDIVIDUAL
                    if (C < 4) {
                        estiloBase.fill = { fgColor: { rgb: COLOR_VERDE_HEADER } };
                        estiloBase.font = { bold: true };
                    } else if (esColumnaRosa) {
                        estiloBase.fill = { fgColor: { rgb: COLOR_ROSA_CHILLON } };
                        estiloBase.font = { color: { rgb: "FFFFFF" }, bold: true, sz: 7 };
                    } else if (C % 9 === 10 || C % 9 === 11) { // SEXO H/M
                        estiloBase.fill = { fgColor: { rgb: COLOR_AMARILLO_PASTEL } };
                        estiloBase.font = { color: { rgb: "CC0000" }, bold: true };
                    } else {
                        estiloBase.fill = { fgColor: { rgb: COLOR_GRIS_SUB } };
                        estiloBase.font = { bold: true };
                    }
                } 
                else if (R === 4) { // Fila 5: ASISTENCIA GRUPAL / H / M / INDIVIDUAL
                    if (C < 4) {
                        estiloBase.fill = { fgColor: { rgb: COLOR_VERDE_HEADER } };
                    } else if (esColumnaRosa) {
                        estiloBase.fill = { fgColor: { rgb: COLOR_ROSA_CHILLON } };
                        estiloBase.font = { color: { rgb: "FFFFFF" }, bold: true, sz: 7 };
                    } else {
                        estiloBase.fill = { fgColor: { rgb: (C % 9 >= 4 && C % 9 <= 9) ? COLOR_AMARILLO_PASTEL : COLOR_GRIS_SUB } };
                        if (C % 9 < 10) estiloBase.font = { color: { rgb: "CC0000" }, bold: true };
                    }
                } 
                else if (R === 5) { // Fila 6: L M X J V S
                    if (C < 4) {
                        estiloBase.fill = { fgColor: { rgb: COLOR_VERDE_HEADER } };
                    } else if (esColumnaRosa) {
                        estiloBase.fill = { fgColor: { rgb: COLOR_ROSA_CHILLON } };
                    } else {
                        estiloBase.fill = { fgColor: { rgb: COLOR_AMARILLO_PASTEL } };
                        estiloBase.font = { bold: true };
                    }
                } 
                else { // Filas 7+ (CUADRÍCULA DE ALUMNOS Y REGISTROS)
                    if (C < 4) {
                        estiloBase.fill = { fgColor: { rgb: "FFFFFF" } };
                        if (C === 2) estiloBase.alignment.horizontal = "left"; // Nombre a la izquierda
                    } else if (esColumnaRosa) {
                        // LA COLUMNA ROSA DE ASISTENCIA INDIVIDUAL
                        estiloBase.fill = { fgColor: { rgb: COLOR_ROSA_CHILLON } };
                        estiloBase.font = { color: { rgb: "FFFFFF" }, bold: true };
                    } else if (C < 40) {
                        // TODA LA ZONA DE ASISTENCIAS EN AMARILLO PASTEL
                        estiloBase.fill = { fgColor: { rgb: COLOR_AMARILLO_PASTEL } };
                    } else {
                        estiloBase.fill = { fgColor: { rgb: "FFFFFF" } };
                    }
                }

                celda.s = estiloBase;
            }
        }

        // Actualizamos la referencia interna del objeto Sheet
        wsSeguimiento['!ref'] = XLSX.utils.encode_range(rango);

        // 4. TABLA 1 (INFORMACIÓN GENERAL) EN SU PROPIA HOJA
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
        wsInfo['!cols'] = [{ wch: 24 }, { wch: 38 }];
        wsInfo['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

        for (let R = 0; R < datosInfo.length; R++) {
            for (let C = 0; C < 2; C++) {
                const ref = XLSX.utils.encode_cell({ r: R, c: C });
                if (!wsInfo[ref]) continue;

                wsInfo[ref].s = {
                    fill: { fgColor: { rgb: R === 0 ? COLOR_VERDE_HEADER : (C === 0 ? "F3F3F3" : "FFFFFF") } },
                    font: { bold: R === 0 || C === 0, sz: 9 },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                };
            }
        }

        // 5. GUARDAR AMBAS HOJAS EN EL ARCHIVO .XLSX
        XLSX.utils.book_append_sheet(wb, wsInfo, "Información General");
        XLSX.utils.book_append_sheet(wb, wsSeguimiento, "Seguimiento Académico");

        XLSX.writeFile(wb, 'Seguimiento_Academico_7A.xlsx');
    });
}