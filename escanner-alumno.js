// Obtener la matrícula del alumno de la URL (ej: /Alumno/alumno.html?matricula=2023001)
const urlParams = new URLSearchParams(window.location.search);
const matriculaAlumno = urlParams.get('matricula');

// Esta función se invoca cuando el lector QR lee el código exitosamente
function alEscanearCodigoQR(contenidoQR) {
    try {
        // Parsear los datos del QR (asumiendo que viene en JSON con { docente, token })
        const datosQR = JSON.parse(contenidoQR);
        
        if (!datosQR.token) {
            alert("El código QR escaneado no es válido para asistencia.");
            return;
        }

        // Enviar la petición al backend
        fetch('/api/registrar-asistencia', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                matricula: matriculaAlumno,
                token: datosQR.token
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.exito) {
                alert(`✅ ${data.mensaje}\nAhora tienes: ${data.totalAsistencias} asistencias.`);
                
                // Si tienes un elemento HTML donde muestras las asistencias (ej: <span id="contador-asistencias">)
                const elemContador = document.getElementById('contador-asistencias');
                if (elemContador) {
                    elemContador.textContent = data.totalAsistencias;
                }
            } else {
                alert(`❌ Error: ${data.mensaje}`);
            }
        })
        .catch(err => {
            console.error('Error al registrar asistencia:', err);
            alert('Ocurrió un error al conectar con el servidor.');
        });

    } catch (e) {
        alert("El código escaneado no tiene un formato válido.");
    }
}