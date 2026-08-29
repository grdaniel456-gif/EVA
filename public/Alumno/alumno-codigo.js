// Capturar la matrícula desde los parámetros de la URL (?matricula=2023001)
const urlParams = new URLSearchParams(window.location.search);
const matriculaAlumno = urlParams.get('matricula');

let html5QrcodeScanner = null;
const mensajeEstado = document.getElementById("mensaje-estado");

function iniciarCamara() {
    if (!matriculaAlumno) {
        mensajeEstado.textContent = "❌ Error: No se detectó la matrícula del alumno en la sesión.";
        mensajeEstado.className = "estado-error";
        return;
    }

    const btnCamara = document.getElementById("btn-camara");
    btnCamara.style.display = "none";

    const readerDiv = document.getElementById("reader");
    readerDiv.style.display = "block";

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: { width: 220, height: 220 } },
        /* verbose= */ false
    );

    html5QrcodeScanner.render(alEscanearExitoso, alFallarEscaneo);
}

function alEscanearExitoso(decodedText, decodedResult) {
    // Detener la cámara tras detectar un código
    html5QrcodeScanner.clear();
    document.getElementById("reader").style.display = "none";
    document.getElementById("btn-camara").style.display = "block";

    mensajeEstado.textContent = "Procesando código...";
    mensajeEstado.className = "estado-espera";

    try {
        // Extraer los datos codificados del QR
        const datos = JSON.parse(decodedText);

        if (!datos.token) {
            mensajeEstado.textContent = "❌ El código QR no es válido para marcar asistencia.";
            mensajeEstado.className = "estado-error";
            return;
        }

        // Mandar el token y la matrícula al servidor
        fetch('/api/registrar-asistencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matricula: matriculaAlumno,
                token: datos.token
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.exito) {
                mensajeEstado.textContent = `✅ ¡Asistencia registrada! Total: ${data.totalAsistencias}`;
                mensajeEstado.className = "estado-exito";
            } else {
                mensajeEstado.textContent = `❌ ${data.mensaje}`;
                mensajeEstado.className = "estado-error";
            }
        })
        .catch(err => {
            console.error('Error al conectar:', err);
            mensajeEstado.textContent = "❌ Error de conexión con el servidor.";
            mensajeEstado.className = "estado-error";
        });

    } catch (e) {
        mensajeEstado.textContent = "❌ El QR escaneado no tiene un formato reconocido.";
        mensajeEstado.className = "estado-error";
    }
}

function alFallarEscaneo(error) {
    // Se ejecuta continuamente mientras busca un código (no es necesario mostrar alerta)
}