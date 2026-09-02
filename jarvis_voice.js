const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Argumentos de consola
const nombreDocente = process.argv[2] || 'Docente';
const archivoSalida = process.argv[3] || path.join(__dirname, 'public', 'jarvis_temp.mp3');

// 2. Mensaje de JARVIS
const textoMensaje = `Bienvenido Ingeniero ${nombreDocente}, ¿qué te gustaría realizar hoy?`;

// 3. Descargar el audio directamente desde Google TTS
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

// 4. Ejecución principal
(async () => {
    try {
        await generarAudioDirecto(textoMensaje, archivoSalida);
        console.log(`[JARVIS] Audio generado exitosamente en: ${archivoSalida}`);
    } catch (error) {
        console.error('Error generando audio de JARVIS:', error);
        process.exit(1);
    }
})();