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

                // Primeras 4 columnas base
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

                // Renderizado 4 sesiones
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


// EXPORTADOR CON ANCHOS NATIVOS Y COLORES FORZADOS
const btnExportar = document.getElementById('btnExportarExcel');
if (btnExportar) {
    btnExportar.addEventListener('click', () => {
        const tablaInfo = document.querySelector('.tabla-info') || document.querySelectorAll('table')[0];
        const tablaSeguimiento = document.getElementById('tablaSeguimiento') || document.querySelectorAll('table')[1];

        // 1. CLONAR Y PROCESAR TABLA 1 (INFORMACIÓN GENERAL)
        let htmlTablaInfo = '';
        if (tablaInfo && tablaInfo !== tablaSeguimiento) {
            const clonInfo = tablaInfo.cloneNode(true);
            clonInfo.setAttribute('border', '1');
            clonInfo.setAttribute('cellspacing', '0');
            clonInfo.setAttribute('cellpadding', '4');
            clonInfo.style.borderCollapse = 'collapse';

            clonInfo.querySelectorAll('tr').forEach((tr, index) => {
                const celdas = tr.querySelectorAll('th, td');
                celdas.forEach(celda => {
                    celda.setAttribute('border', '1');
                    celda.style.border = '1px solid #000000';
                    celda.style.fontSize = '11pt';
                    celda.style.fontFamily = 'Arial, sans-serif';

                    if (index === 0) {
                        celda.setAttribute('bgcolor', '#D9EAD3');
                        celda.style.backgroundColor = '#D9EAD3';
                        celda.style.fontWeight = 'bold';
                        celda.style.textAlign = 'center';
                    } else {
                        const esEtiqueta = celda === celdas[0];
                        if (esEtiqueta) {
                            celda.setAttribute('bgcolor', '#F3F3F3');
                            celda.style.backgroundColor = '#F3F3F3';
                            celda.style.fontWeight = 'bold';
                            celda.setAttribute('width', '200');
                        } else {
                            celda.setAttribute('bgcolor', '#FFFFFF');
                            celda.style.backgroundColor = '#FFFFFF';
                            celda.setAttribute('width', '300');
                        }
                    }
                });
            });
            htmlTablaInfo = clonInfo.outerHTML;
        }

        // 2. CLONAR Y PROCESAR TABLA 2 (SEGUIMIENTO DE ASISTENCIA)
        const clonSeguimiento = tablaSeguimiento.cloneNode(true);
        clonSeguimiento.setAttribute('border', '1');
        clonSeguimiento.setAttribute('cellspacing', '0');
        clonSeguimiento.setAttribute('cellpadding', '3');
        clonSeguimiento.style.borderCollapse = 'collapse';

        // Definir anchos explícitos por columna para evitar flechas rojas y textos cortados
        let htmlCols = `
            <colgroup>
                <col width="45">  <!-- N° -->
                <col width="110"> <!-- MATRÍCULA -->
                <col width="260"> <!-- NOMBRE DEL ALUMNO -->
                <col width="60">  <!-- SEXO H/M -->
        `;
        // 4 Sesiones
        for (let i = 0; i < 4; i++) {
            htmlCols += `
                <col width="30"><col width="30"><col width="30"><col width="30"><col width="30"><col width="30"> <!-- L M X J V S -->
                <col width="35"><col width="35"> <!-- H M -->
                <col width="140"> <!-- FECHA/ASISTENCIA INDIVIDUAL ROSA -->
            `;
        }
        htmlCols += `
                <col width="100"><col width="100"><col width="100">
            </colgroup>
        `;

        clonSeguimiento.insertAdjacentHTML('afterbegin', htmlCols);

        // Procesar estilos celda por celda
        clonSeguimiento.querySelectorAll('tr').forEach(fila => {
            fila.querySelectorAll('th, td').forEach(celda => {
                celda.setAttribute('border', '1');
                celda.style.border = '1px solid #000000';
                celda.style.verticalAlign = 'middle';
                celda.style.fontSize = '9pt';
                celda.style.fontFamily = 'Arial, sans-serif';

                const texto = celda.innerText.trim();
                const textoUpper = texto.toUpperCase();
                const estilo = celda.getAttribute('style') || '';
                const clase = celda.className || '';

                // A) ENCABEZADO VERDE
                if (textoUpper.includes('INFORMACIÓN ESTUDIANTIL') || clase.includes('header-estudiantil')) {
                    celda.setAttribute('bgcolor', '#D9EAD3');
                    celda.style.backgroundColor = '#D9EAD3';
                    celda.style.fontWeight = 'bold';
                    celda.style.color = '#000000';
                }
                // B) ENCABEZADO GRIS PRIMER PARCIAL
                else if (textoUpper.includes('PRIMER PARCIAL') || clase.includes('header-parcial')) {
                    celda.setAttribute('bgcolor', '#D9D9D9');
                    celda.style.backgroundColor = '#D9D9D9';
                    celda.style.fontWeight = 'bold';
                    celda.style.fontSize = '12pt';
                    celda.style.color = '#000000';
                }
                // C) TEXTOS ROJOS (SESIONES, ACTIVIDADES, ASISTENCIA GRUPAL, SEXO H/M)
                else if (textoUpper.includes('SESIÓN') || textoUpper.includes('ESCRIBA EN LA CELDA') || textoUpper.includes('ASISTENCIA GRUPAL') || textoUpper === 'SEXO' || textoUpper === 'SEXO H/M') {
                    celda.setAttribute('bgcolor', textoUpper === 'SEXO' ? '#FFF2CC' : '#EFEFEF');
                    celda.style.backgroundColor = textoUpper === 'SEXO' ? '#FFF2CC' : '#EFEFEF';
                    celda.style.color = '#CC0000'; // ROJO VIVO EN EXCEL
                    celda.style.fontWeight = 'bold';
                }
                // D) CAMPO ROSA (FECHA/ASISTENCIA INDIVIDUAL Y COLUMNA DE DATOS ROSA)
                else if (textoUpper.includes('FECHA INDIVIDUAL') || textoUpper.includes('ASISTENCIA INDIVIDUAL') || clase.includes('bg-rosa') || estilo.includes('#ff26a8')) {
                    celda.setAttribute('bgcolor', '#FF26A8');
                    celda.style.backgroundColor = '#FF26A8';
                    celda.style.color = '#FFFFFF';
                    celda.style.fontWeight = 'bold';
                }
                // E) AMARILLO DÍAS L M X J V S Y COLUMNA SEXO H M
                else if (clase.includes('bg-amarillo') || clase.includes('col-h-m') || estilo.includes('#fff2cc')) {
                    celda.setAttribute('bgcolor', '#FFF2CC');
                    celda.style.backgroundColor = '#FFF2CC';
                    celda.style.color = '#000000';
                }
                // F) CELDAS DE DATOS BLANCAS (MATRICULA, NOMBRE, N°)
                else {
                    if (!celda.hasAttribute('bgcolor')) {
                        celda.setAttribute('bgcolor', '#FFFFFF');
                        celda.style.backgroundColor = '#FFFFFF';
                    }
                }
            });
        });

        // 3. GENERAR EL ENCABEZADO Y XML NATIVO DE EXCEL
        const contenidoExcel = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                  xmlns:x="urn:schemas-microsoft-com:office:excel" 
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Seguimiento Académico</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table { border-collapse: collapse; table-layout: fixed; }
                    td, th { border: 1px solid #000000 !important; text-align: center; vertical-align: middle; }
                </style>
            </head>
            <body>
                ${htmlTablaInfo}
                <br/><br/>
                ${clonSeguimiento.outerHTML}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', contenidoExcel], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Seguimiento_Academico_7A.xls';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}