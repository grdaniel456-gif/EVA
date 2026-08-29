const express = require('express');
const http = require('http'); // 1. Requerido para Socket.IO
const { Server } = require('socket.io'); // 1. Requerido para Socket.IO
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app); // Servidor HTTP para Socket.IO
const io = new Server(server); // Instancia de WebSockets

const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- LÓGICA DE TOKENS EN TIEMPO REAL (QRs de un solo uso) ---
let tokenActivoActual = null;

function generarTokenUnico() {
    return 'TOKEN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// Funciones auxiliares para trabajar con los JSON
const leerJSON = (archivo) => {
    const filePath = path.join(__dirname, archivo);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
};

const guardarJSON = (archivo, datos) => {
    const filePath = path.join(__dirname, archivo);
    fs.writeFileSync(filePath, JSON.stringify(datos, null, 2));
};

// --- WEBSOCKETS (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('Cliente conectado por WebSocket');

    // Cuando codigos.html abre la vista, pide el primer QR
    socket.on('solicitar_nuevo_qr', () => {
        tokenActivoActual = generarTokenUnico();
        socket.emit('actualizar_qr', { token: tokenActivoActual });
    });
});

// --- RUTA DE REGISTRO (SOLO ESTUDIANTES) ---
app.post('/api/registro', (req, res) => {
    const { rol, nombre, matricula, password } = req.body;

    if (rol === 'estudiante') {
        const estudiantes = leerJSON('estudiantes.json');
        
        // Verificar si la matrícula ya existe
        const existe = estudiantes.some(est => est.matricula === matricula);
        if (existe) {
            return res.status(400).send(`
                <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                    La matrícula ya está registrada.
                </h1>
                <p style="text-align: center;"><a href="/registro.html">Volver a intentar</a></p>
            `);
        }

        // Guardar nuevo estudiante
        const nuevoEstudiante = { id: Date.now(), nombre, matricula, password };
        estudiantes.push(nuevoEstudiante);
        guardarJSON('estudiantes.json', estudiantes);

        // REDIRECCIÓN A LA PÁGINA BONITA DE ÉXITO
        return res.redirect('/Registros/registro-exito.html');

    } else {
        return res.status(400).send('Rol no permitido. Solo se aceptan registros de estudiantes.');
    }
});

// --- RUTA DE LOGIN ---
app.post('/login', (req, res) => {
    const { rol, matricula, nombre, password } = req.body;

    if (rol === 'estudiante') {
        const estudiantes = leerJSON('estudiantes.json');
        const usuario = estudiantes.find(est => est.matricula === matricula && est.password === password);

        if (usuario) {
            const nombreUrl = encodeURIComponent(usuario.nombre);
            const matriculaUrl = encodeURIComponent(usuario.matricula);
            
            // Redirige al panel de Alumnos
            return res.redirect(`/Registros/dashboard.html?nombre=${nombreUrl}&matricula=${matriculaUrl}`);
        } else {
            return res.status(401).send(`
                <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                    Matrícula o contraseña incorrectas.
                </h1>
                <p style="text-align: center;"><a href="/index.html">Volver a intentar</a></p>
            `);
        }
    } else if (rol === 'docente') {
        const docentes = leerJSON('docentes.json');
        const usuario = docentes.find(doc => doc.nombre.toLowerCase() === nombre.toLowerCase() && doc.password === password);

        if (usuario) {
            const nombreUrl = encodeURIComponent(usuario.nombre);
            // Si el docente no tiene numEmpleado en el JSON, mandará un valor por defecto (ej. D-101)
            const numEmpUrl = encodeURIComponent(usuario.numEmpleado || 'D-101');
            
            // REDIRECCIÓN CORRECTA AL PANEL DE DOCENTE
            return res.redirect(`/Docente/docente.html?nombre=${nombreUrl}&numEmpleado=${numEmpUrl}`);
        } else {
            return res.status(401).send(`
                <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                    Nombre o contraseña incorrectos.
                </h1>
                <p style="text-align: center;"><a href="/index.html">Volver a intentar</a></p>
            `);
        }
    } else {
        return res.status(400).send('Rol no válido');
    }
});

// --- RUTA API: REGISTRO Y VALIDACIÓN DE ASISTENCIA ---
app.post('/api/registrar-asistencia', (req, res) => {
    const { matricula, token } = req.body;

    // Verificar si el token enviado coincide con el token activo actual
    if (!token || token !== tokenActivoActual) {
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'El código QR ya no es válido o ya fue escaneado.' 
        });
    }

    // 1. Quemamos/Invalidamos el token generando uno totalmente nuevo
    tokenActivoActual = generarTokenUnico();

    // 2. Transmitimos vía WebSockets al panel del docente para refrescar la pantalla en tiempo real
    io.emit('actualizar_qr', { 
        token: tokenActivoActual,
        ultimoAlumno: matricula 
    });

    return res.json({ exito: true, mensaje: 'Asistencia registrada exitosamente.' });
});

// Cambiamos app.listen por server.listen para activar WebSockets
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});









    // --- RUTA API: REGISTRO Y VALIDACIÓN DE ASISTENCIA CON CONTADOR (+1) ---
app.post('/api/registrar-asistencia', (req, res) => {
    const { matricula, token } = req.body;

    // 1. Validar que el token enviado sea el activo actualmente
    if (!token || token !== tokenActivoActual) {
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'El código QR ya no es válido o ya fue escaneado.' 
        });
    }

    // 2. Cargar lista de estudiantes y buscar al alumno logueado
    const estudiantes = leerJSON('estudiantes.json');
    const alumnoIndex = estudiantes.findIndex(est => est.matricula === matricula);

    if (alumnoIndex === -1) {
        return res.status(404).json({
            exito: false,
            mensaje: 'Estudiante no encontrado.'
        });
    }

    // 3. Incrementar el contador de asistencias +1
    // Si la propiedad no existe aún en el alumno, la inicializamos en 1, si no, le sumamos 1
    if (!estudiantes[alumnoIndex].asistencias) {
        estudiantes[alumnoIndex].asistencias = 1;
    } else {
        estudiantes[alumnoIndex].asistencias += 1;
    }

    // Guardar los cambios actualizados en estudiantes.json
    guardarJSON('estudiantes.json', estudiantes);

    // 4. Guardar también en el registro de historial asistencias.json (opcional pero recomendado)
    const asistenciasHistorial = leerJSON('asistencias.json');
    asistenciasHistorial.push({
        id: Date.now(),
        matricula: matricula,
        fecha: new Date().toLocaleString()
    });
    guardarJSON('asistencias.json', asistenciasHistorial);

    // 5. Invalidad/Quemar el token actual creando uno nuevo
    tokenActivoActual = generarTokenUnico();

    // 6. Transmitir por WebSockets al proyector/pantalla del docente para cambiar el QR
    io.emit('actualizar_qr', { 
        token: tokenActivoActual,
        ultimoAlumno: matricula 
    });

    // 7. Responder al celular del alumno con el nuevo total de asistencias
    return res.json({ 
        exito: true, 
        mensaje: '¡Asistencia registrada con éxito!',
        totalAsistencias: estudiantes[alumnoIndex].asistencias
    });
});