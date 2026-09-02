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

function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Agregar mensaje del usuario
    appendMessage(text, 'user');
    userInput.value = '';

    // Simular respuesta de JARVIS
    setTimeout(() => {
        appendMessage('Procesando su solicitud... (aquí puedes conectar la API o lógica deseada)', 'jarvis');
    }, 1000);
}

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});


// Obtener el nombre del docente (de la URL o de localStorage / parámetro)
const urlParams = new URLSearchParams(window.location.search);
const nombreDocente = urlParams.get('nombre') || 'Daniel';

async function reproducirBienvenidaJarvis() {
    try {
        const response = await fetch('/api/jarvis-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombreDocente })
        });

        const data = await response.json();
        if (data.exito && data.audioUrl) {
            // Reproducir el audio directamente en el navegador del usuario
            const audio = new Audio(data.audioUrl + '?t=' + new Date().getTime()); // Evitar caché
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