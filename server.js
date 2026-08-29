const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. BASE DE DATOS SQLITE ---
const db = new sqlite3.Database('./datos.db', (err) => {
    if (err) console.error('Error al conectar con SQLite:', err.message);
    else console.log('Base de datos SQLite conectada exitosamente.');
});

// Crear tabla de alumnos si no existe
db.run(`
    CREATE TABLE IF NOT EXISTS alumnos (
        matricula TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        asistencias INTEGER DEFAULT 0
    )
`);

// --- 2. LÓGICA DE TOKENS (QR en tiempo real) ---
let tokenActivoActual = null;

function generarTokenUnico() {
    return 'TOKEN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// Funciones auxiliares para trabajar con JSON (Docentes/Auth)
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

// --- 3. WEBSOCKETS (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('Cliente conectado por WebSocket');

    socket.on('solicitar_nuevo_qr', () => {
        tokenActivoActual = generarTokenUnico();
        socket.emit('actualizar_qr', { token: tokenActivoActual });
    });
});

// --- 4. RUTA DE REGISTRO DE ALUMNOS (SQLITE) ---
app.post('/api/registro', (req, res) => {
    const { matricula, nombre } = req.body;

    if (!matricula || !nombre) {
        return res.status(400).json({ exito: false, mensaje: 'Matrícula y nombre son requeridos.' });
    }

    const query = `INSERT INTO alumnos (matricula, nombre, asistencias) VALUES (?, ?, 0)`;
    
    db.run(query, [matricula, nombre], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ exito: false, mensaje: 'La matrícula ya está registrada.' });
            }
            return res.status(500).json({ exito: false, mensaje: 'Error al registrar alumno.' });
        }
        res.json({ exito: true, mensaje: 'Estudiante registrado correctamente en SQLite.' });
    });
});

// --- 5. RUTA DE LOGIN ---
app.post('/login', (req, res) => {
    const { rol, matricula, nombre, password } = req.body;

    if (rol === 'estudiante') {
        const estudiantes = leerJSON('estudiantes.json');
        const usuario = estudiantes.find(est => est.matricula === matricula && est.password === password);

        if (usuario) {
            const nombreUrl = encodeURIComponent(usuario.nombre);
            const matriculaUrl = encodeURIComponent(usuario.matricula);
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
            const numEmpUrl = encodeURIComponent(usuario.numEmpleado || 'D-101');
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

// --- 6. RUTA API: ESCANEO Y REGISTRO DE ASISTENCIA (+1 EN SQLITE Y QR WEB SOCKET) ---
app.post('/api/registrar-asistencia', (req, res) => {
    const { matricula, token } = req.body;

    // 1. Validar Token QR
    if (!token || token !== tokenActivoActual) {
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'El código QR ya no es válido o ya fue escaneado.' 
        });
    }

    // 2. Incrementar +1 la asistencia en SQLite
    const updateQuery = `UPDATE alumnos SET asistencias = asistencias + 1 WHERE matricula = ?`;

    db.run(updateQuery, [matricula], function(err) {
        if (err) {
            return res.status(500).json({ exito: false, mensaje: 'Error al actualizar asistencia.' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Matrícula no encontrada en la base de datos.' });
        }

        // 3. Quemar token e informar al docente vía WebSocket
        tokenActivoActual = generarTokenUnico();
        io.emit('actualizar_qr', { 
            token: tokenActivoActual,
            ultimoAlumno: matricula 
        });

        // 4. Obtener total de asistencias actualizado para devolverlo
        db.get(`SELECT nombre, asistencias FROM alumnos WHERE matricula = ?`, [matricula], (err, row) => {
            if (err) {
                return res.status(500).json({ exito: false, mensaje: 'Error al consultar asistencias.' });
            }

            res.json({
                exito: true,
                mensaje: `¡Asistencia registrada para ${row.nombre}!`,
                totalAsistencias: row.asistencias
            });
        });
    });
});

// --- 7. CONSULTAR BASE DE DATOS DE ALUMNOS ---
app.get('/api/alumnos', (req, res) => {
    db.all(`SELECT matricula, nombre, asistencias FROM alumnos`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ exito: false, mensaje: err.message });
        }
        res.json(rows);
    });
});

// --- 8. ARRANCAR SERVIDOR ---
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});