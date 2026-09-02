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