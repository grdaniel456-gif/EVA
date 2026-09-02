const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Lectura de argumentos pasados desde Node.js
const nombreRecibido = process.argv[2] || 'Docente';
const archivoSalida = process.argv[3] || path.join(__dirname, 'public', 'jarvis_temp.mp3');

// 2. Función para procesar la regla de los nombres (1 o 2 nombres según el total de palabras)
function obtenerNombreCorto(nombreCompleto) {
    if (!nombreCompleto || nombreCompleto.toLowerCase() === 'docente') return 'Docente';
    
    const palabras = nombreCompleto.trim().split(/\s+/);
    
    // Si tiene 4 o más palabras, toma los 2 primeros nombres (ej: "Juan Carlos")
    if (palabras.length >= 4) {
        return `${palabras[0]} ${palabras[1]}`;
    }
    
    // Si tiene 3 o menos palabras, toma solo el primer nombre (ej: "Anselmo")
    return palabras[0];
}

const nombreProcesado = obtenerNombreCorto(nombreRecibido);

// 3. Mensaje personalizado y natural para JARVIS
const textoMensaje = `Bienvenido ${nombreProcesado}, ¿qué te gustaría realizar hoy?`;

// 4. Descargar audio directo desde Google TTS
function generarAudioDirecto(texto, destino) {
    return new Promise((resolve, reject) => {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=es&client=tw-ob`;
        const file = fs.createWriteStream(destino);

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Error de Google TTS: ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(destino, () => {}); 
            reject(err);
        });
    });
}

// 5. Ejecución principal
(async () => {
    try {
        await generarAudioDirecto(textoMensaje, archivoSalida);
        console.log(`[JARVIS] Audio generado exitosamente para: ${nombreProcesado}`);
    } catch (error) {
        console.error('Error generando audio de JARVIS:', error);
        process.exit(1);
    }
})();