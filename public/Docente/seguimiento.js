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


// EXPORTADOR CON TABLA SEPARADA Y FORZADO DE COLUMNAS ANCHAS
const btnExportar = document.getElementById('btnExportarExcel');
if (btnExportar) {
    btnExportar.addEventListener('click', () => {
        const tablaInfo = document.querySelector('.tabla-info') || document.querySelectorAll('table')[0];
        const tablaSeguimiento = document.getElementById('tablaSeguimiento') || document.querySelectorAll('table')[1];

        // 1. PROCESAR TABLA 1 (INFORMACIÓN GENERAL)
        let htmlTablaInfo = '';
        if (tablaInfo && tablaInfo !== tablaSeguimiento) {
            const clonInfo = tablaInfo.cloneNode(true);
            clonInfo.setAttribute('border', '1');
            clonInfo.setAttribute('cellspacing', '0');
            clonInfo.setAttribute('cellpadding', '5');

            // Insertar colgroup obligatorio para forzar anchos en LibreOffice Calc
            const colgroup = document.createElement('colgroup');
            colgroup.innerHTML = '<col width="220"><col width="330">';
            clonInfo.insertBefore(colgroup, clonInfo.firstChild);

            clonInfo.querySelectorAll('tr').forEach((tr, idx) => {
                tr.setAttribute('height', '28');
                const celdas = tr.querySelectorAll('th, td');
                
                if (idx === 0) {
                    const celdaTitulo = celdas[0];
                    celdaTitulo.setAttribute('bgcolor', '#D9EAD3');
                    celdaTitulo.setAttribute('colspan', '2');
                    celdaTitulo.setAttribute('width', '550');
                    celdaTitulo.innerHTML = `<b><font color="#000000" size="3">1. INFORMACIÓN GENERAL</font></b>`;
                    if (celdas.length > 1) celdas[1].remove();
                } else {
                    if (celdas[0]) {
                        celdas[0].setAttribute('bgcolor', '#F3F3F3');
                        celdas[0].setAttribute('width', '220');
                        celdas[0].innerHTML = `<b><font color="#000000">${celdas[0].innerText.trim()}</font></b>`;
                    }
                    if (celdas[1]) {
                        celdas[1].setAttribute('bgcolor', '#FFFFFF');
                        celdas[1].setAttribute('width', '330');
                        celdas[1].innerHTML = `<font color="#000000">${celdas[1].innerText.trim()}</font>`;
                    }
                }
            });
            htmlTablaInfo = clonInfo.outerHTML;
        }

        // 2. PROCESAR TABLA 2 (SEGUIMIENTO Y ASISTENCIA)
        const clonSeguimiento = tablaSeguimiento.cloneNode(true);
        clonSeguimiento.setAttribute('border', '1');
        clonSeguimiento.setAttribute('cellspacing', '0');
        clonSeguimiento.setAttribute('cellpadding', '4');

        // Modificar filas de la tabla 2
        const filas = clonSeguimiento.querySelectorAll('tr');
        filas.forEach((fila, idx) => {
            if (idx < 6) fila.setAttribute('height', '32');
            else fila.setAttribute('height', '26');
        });

        // Aplicar etiquetas FONT rojas y colores de fondo
        filas.forEach(fila => {
            fila.querySelectorAll('th, td').forEach(celda => {
                celda.setAttribute('border', '1');
                celda.style.border = '1px solid #000000';
                
                const textoOriginal = celda.innerText.trim();
                const textoUpper = textoOriginal.toUpperCase();
                const estilo = celda.getAttribute('style') || '';
                const clase = celda.className || '';

                if (
                    textoUpper.includes('SESIÓN') || 
                    textoUpper.includes('ESCRIBA EN LA CELDA') || 
                    textoUpper.includes('ASISTENCIA GRUPAL') || 
                    textoUpper === 'SEXO' || 
                    textoUpper === 'SEXO H/M'
                ) {
                    celda.setAttribute('bgcolor', (textoUpper === 'SEXO' || textoUpper === 'SEXO H/M') ? '#FFF2CC' : '#EFEFEF');
                    celda.innerHTML = `<b><font color="#FF0000">${textoOriginal}</font></b>`;
                }
                else if (textoUpper.includes('INFORMACIÓN ESTUDIANTIL') || clase.includes('header-estudiantil')) {
                    celda.setAttribute('bgcolor', '#D9EAD3');
                    celda.innerHTML = `<b><font color="#000000">${textoOriginal}</font></b>`;
                }
                else if (textoUpper.includes('PRIMER PARCIAL') || clase.includes('header-parcial')) {
                    celda.setAttribute('bgcolor', '#D9D9D9');
                    celda.innerHTML = `<b><font color="#000000">${textoOriginal}</font></b>`;
                }
                else if (textoUpper.includes('FECHA INDIVIDUAL') || textoUpper.includes('ASISTENCIA INDIVIDUAL') || clase.includes('bg-rosa') || estilo.includes('#ff26a8')) {
                    celda.setAttribute('bgcolor', '#FF26A8');
                    celda.innerHTML = `<b><font color="#FFFFFF">${textoOriginal}</font></b>`;
                }
                else if (clase.includes('bg-amarillo') || clase.includes('col-h-m') || estilo.includes('#fff2cc')) {
                    celda.setAttribute('bgcolor', '#FFF2CC');
                    if (textoOriginal !== '') celda.innerHTML = `<font color="#000000">${textoOriginal}</font>`;
                }
                else {
                    if (!celda.hasAttribute('bgcolor')) celda.setAttribute('bgcolor', '#FFFFFF');
                    if (textoOriginal !== '') celda.innerHTML = `<font color="#000000">${textoOriginal}</font>`;
                }
            });
        });

        // 3. ESTRUCTURA COMPATIBLE
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