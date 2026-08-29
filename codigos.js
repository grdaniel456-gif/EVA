document.addEventListener("DOMContentLoaded", () => {
    const socket = io(); // Conexión WebSocket con el servidor
    const qrcodeContainer = document.getElementById("qrcode");
    const estadoTexto = document.getElementById("estado-texto");

    // Función que dibuja el QR en el lienzo HTML
    function renderizarQR(token) {
        qrcodeContainer.innerHTML = ""; // Limpiar el QR previo

        const payload = JSON.stringify({
            docente: "D-101",
            token: token
        });

        new QRCode(qrcodeContainer, {
            text: payload,
            width: 220,
            height: 220,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Al abrir la ventana, le pedimos al backend nuestro primer token
    socket.emit("solicitar_nuevo_qr");

    // Escuchar cuando el servidor notifique que un alumno escaneó el código
    socket.on("actualizar_qr", (data) => {
        renderizarQR(data.token);

        if (data.ultimoAlumno) {
            estadoTexto.textContent = `¡Asistencia de ${data.ultimoAlumno} registrada! Cambiando QR...`;
            estadoTexto.style.color = "#2e7d32";
            
            setTimeout(() => {
                estadoTexto.textContent = "Esperando escaneo...";
                estadoTexto.style.color = "#4a5568";
            }, 3000);
        }
    });
});