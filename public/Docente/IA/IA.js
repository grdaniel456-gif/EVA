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

    // Renderizar Markdown si la librería 'marked' está presente en el HTML
    const contentHTML = (typeof marked !== 'undefined' && sender === 'jarvis') 
        ? marked.parse(text) 
        : `<p>${text}</p>`;

    messageDiv.innerHTML = `
        <div class="message-content">
            ${contentHTML}
            <span class="timestamp">${getFormattedTime()}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- CONEXIÓN REAL CON LA API DE GEMINI EN SERVER.JS ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Mostrar mensaje del usuario en la pantalla
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
        // 3. Petición POST al servidor
        const response = await fetch('/api/jarvis-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mensaje: text, 
                nombre: nombreDocente 
            })
        });

        const data = await response.json();
        
        // Remover mensaje temporal de espera
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

// --- EVENT LISTENERS PARA ENVÍO ---
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Evita recargar la página o comportamientos raros
        sendMessage();
    }
});

// --- LÓGICA DE RECORTE Y OBTENCIÓN DE NOMBRE DE USUARIO ---
function obtenerNombreCorto(nombreCompleto) {
    if (!nombreCompleto || nombreCompleto.toLowerCase() === 'docente') return 'Docente';

    const palabras = nombreCompleto.trim().split(/\s+/);

    if (palabras.length >= 4) {
        return `${palabras[0]} ${palabras[1]}`;
    }

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

// 3. Nombre filtrado
const nombreDocente = obtenerNombreCorto(nombreRaw);

// --- SALUDO DE VOZ DE BIENVENIDA DE JARVIS ---
async function reproducirBienvenidaJarvis() {
    try {
        const response = await fetch('/api/jarvis-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombreDocente })
        });

        const data = await response.json();
        if (data.exito && data.audioUrl) {
            const audio = new Audio(data.audioUrl + '?t=' + new Date().getTime());
            audio.play().catch(err => {
                console.log("El navegador bloqueó el autoplay, se requiere interacción previa del usuario:", err);
            });
        }
    } catch (err) {
        console.error("Error conectando con JARVIS:", err);
    }
}

// Ejecutar bienvenida al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    reproducirBienvenidaJarvis();
});