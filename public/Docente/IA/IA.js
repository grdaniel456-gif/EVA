const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const chatMessages = document.getElementById('chatMessages');

function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${text}</p>
            <span class="timestamp">${getFormattedTime()}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- CONEXIÓN CON LA API DE GEMINI ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Mostrar mensaje del usuario en pantalla
    appendMessage(text, 'user');
    userInput.value = '';

    // 2. Crear mensaje temporal de espera ("Pensando...")
    const tempJarvisMsg = document.createElement('div');
    tempJarvisMsg.classList.add('message', 'jarvis');
    tempJarvisMsg.innerHTML = `
        <div class="message-content">
            <p><i>J.A.R.V.I.S. está pensando...</i></p>
        </div>
    `;
    chatMessages.appendChild(tempJarvisMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // 3. Petición al endpoint backend conectado a Gemini API
        const response = await fetch('/api/jarvis-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mensaje: text, 
                nombre: nombreDocente 
            })
        });

        const data = await response.json();
        
        // Quitar mensaje temporal de espera
        chatMessages.removeChild(tempJarvisMsg);

        if (data.exito) {
            appendMessage(data.respuesta, 'jarvis');
        } else {
            appendMessage(data.respuesta || "Lo siento, ocurrió un inconveniente técnico al conectar mis redes neuronales.", 'jarvis');
        }
    } catch (err) {
        chatMessages.removeChild(tempJarvisMsg);
        appendMessage("Error de conexión al servidor JARVIS.", 'jarvis');
        console.error("Error en chat:", err);
    }
}

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});


// --- LÓGICA DE RECORTE Y OBTENCIÓN DE NOMBRE ---
function obtenerNombreCorto(nombreCompleto) {
    if (!nombreCompleto || nombreCompleto.toLowerCase() === 'docente') return 'Docente';

    // Limpiar espacios extra y separar por palabras
    const palabras = nombreCompleto.trim().split(/\s+/);

    // Si tiene 4 o más palabras (ej: "Juan Carlos Pérez Gómez") -> Toma los 2 primeros nombres
    if (palabras.length >= 4) {
        return `${palabras[0]} ${palabras[1]}`;
    }

    // Si tiene 3 palabras o menos (ej: "Anselmo Pérez Gómez" o "María López") -> Toma solo el 1er nombre
    return palabras[0];
}

// 1. Obtener de la URL
const urlParams = new URLSearchParams(window.location.search);
let nombreRaw = urlParams.get('nombre');

// 2. Persistir o recuperar de localStorage
if (nombreRaw) {
    localStorage.setItem('nombreUsuario', nombreRaw);
} else {
    nombreRaw = localStorage.getItem('nombreUsuario') || 'Docente';
}

// 3. Aplicar filtro para obtener 1 o 2 nombres únicamente
const nombreDocente = obtenerNombreCorto(nombreRaw);


// --- LLAMADA A LA API DE BIENVENIDA JARVIS ---
async function reproducirBienvenidaJarvis() {
    try {
        const response = await fetch('/api/jarvis-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombreDocente })
        });

        const data = await response.json();
        if (data.exito && data.audioUrl) {
            // Reproducir audio sin caché
            const audio = new Audio(data.audioUrl + '?t=' + new Date().getTime());
            audio.play().catch(err => {
                console.log("El navegador bloqueó el autoplay, se requiere interacción previa del usuario:", err);
            });
        }
    } catch (err) {
        console.error("Error conectando con JARVIS:", err);
    }
}

// Ejecutar el saludo al entrar al chat
document.addEventListener('DOMContentLoaded', () => {
    reproducirBienvenidaJarvis();
});