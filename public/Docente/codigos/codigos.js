document.addEventListener("DOMContentLoaded", () => {
    const qrcodeContainer = document.getElementById("qrcode");
    const estadoTexto = document.getElementById("estado-texto");
    const TIEMPO_ROTACION_MS = 5000; // 5000 ms = 5 segundos (puedes cambiarlo a 15000 para 15s)

    function generarQRPorTiempo() {
        qrcodeContainer.innerHTML = "";

        // Generamos un token temporal
        const tokenUnico = 'TEMP-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const payload = JSON.stringify({
            docente: "D-101",
            token: tokenUnico,
            modo: "temporizador"
        });

        new QRCode(qrcodeContainer, {
            text: payload,
            width: 220,
            height: 220,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        if (estadoTexto) {
            estadoTexto.textContent = "Código válido por 10 segundos...";
        }
    }

    // 1. Generar el primero de inmediato
    generarQRPorTiempo();

    // 2. Rotar cada 10 segundos automáticos
    setInterval(() => {
        generarQRPorTiempo();
    }, TIEMPO_ROTACION_MS);
});