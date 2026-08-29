const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. CONEXIÓN A POSTGRESQL ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://eva_db_n0jc_user:zosdPzPXVx0e8Rw8ePgibu144pkn8WYX@dpg-da9io1hf2nfc73fmjdeg-a/eva_db_n0jc',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Inicializar tabla de alumnos en PostgreSQL
const inicializarBD = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS alumnos (
                matricula VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                password VARCHAR(100) NOT NULL,
                asistencias INT DEFAULT 0
            );
        `);
        console.log('Tabla "alumnos" en PostgreSQL lista y verificada.');
    } catch (err) {
        console.error('Error inicializando PostgreSQL:', err);
    }
};

inicializarBD();

// Leer JSON únicamente para Docentes (opcional, si aún manejas docentes por JSON)
const leerJSON = (archivo) => {
    const filePath = path.join(__dirname, archivo);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
};

// --- 2. LÓGICA DE TOKENS (QR en tiempo real) ---
let tokenActivoActual = null;

function generarTokenUnico() {
    return 'TOKEN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// --- 3. WEBSOCKETS (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('Cliente conectado por WebSocket');

    socket.on('solicitar_nuevo_qr', () => {
        tokenActivoActual = generarTokenUnico();
        socket.emit('actualizar_qr', { token: tokenActivoActual });
    });
});

// --- 4. RUTA DE REGISTRO DE ALUMNOS (Directo a PG) ---
app.post('/api/registro', async (req, res) => {
    const { matricula, nombre, password } = req.body;

    if (!matricula || !nombre || !password) {
        return res.status(400).json({ exito: false, mensaje: 'Matrícula, nombre y contraseña son requeridos.' });
    }

    try {
        await pool.query(
            'INSERT INTO alumnos (matricula, nombre, password, asistencias) VALUES ($1, $2, $3, 0)',
            [matricula, nombre, password]
        );
        res.json({ exito: true, mensaje: 'Estudiante registrado correctamente en la base de datos.' });
    } catch (err) {
        if (err.code === '23505') { // Clave duplicada en Postgres
            return res.status(400).json({ exito: false, mensaje: 'La matrícula ya está registrada.' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error al registrar alumno.' });
    }
});

// --- 5. RUTA DE LOGIN (Directo en Postgres) ---
app.post('/login', async (req, res) => {
    const { rol, matricula, nombre, password } = req.body;

    if (rol === 'estudiante') {
        try {
            // Consulta directa a PostgreSQL para validar credenciales
            const result = await pool.query(
                'SELECT * FROM alumnos WHERE matricula = $1 AND password = $2',
                [matricula, password]
            );

            const usuario = result.rows[0];

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
        } catch (err) {
            console.error('Error en login de estudiante:', err);
            return res.status(500).send('Error interno en el servidor.');
        }

    } else if (rol === 'docente') {
        // Mantiene docentes en JSON por ahora
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

// --- 6. RUTA API: ESCANEO Y REGISTRO DE ASISTENCIA (+1 REAL) ---
app.post('/api/registrar-asistencia', async (req, res) => {
    const { matricula, token } = req.body;

    // 1. Validar Token QR
    if (!token || token !== tokenActivoActual) {
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'El código QR ya no es válido o ya fue escaneado.' 
        });
    }

    try {
        // Sumar +1 asistencia directamente en PostgreSQL
        const updateResult = await pool.query(
            'UPDATE alumnos SET asistencias = asistencias + 1 WHERE matricula = $1 RETURNING *',
            [matricula]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'El estudiante no existe en la base de datos.' });
        }

        const alumno = updateResult.rows[0];

        // 2. Quemar token e informar al docente vía WebSockets
        tokenActivoActual = generarTokenUnico();
        io.emit('actualizar_qr', { 
            token: tokenActivoActual,
            ultimoAlumno: matricula 
        });

        // 3. Responder
        res.json({
            exito: true,
            mensaje: `¡Asistencia registrada para ${alumno.nombre}!`,
            totalAsistencias: alumno.asistencias
        });

    } catch (err) {
        console.error('Error en PostgreSQL:', err);
        res.status(500).json({ exito: false, mensaje: 'Error al registrar la asistencia.' });
    }
});

// --- 7. CONSULTAR LISTA DE ALUMNOS ---
app.get('/api/alumnos', async (req, res) => {
    try {
        const result = await pool.query('SELECT matricula, nombre, asistencias FROM alumnos ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ exito: false, mensaje: err.message });
    }
});

// --- 8. ARRANCAR SERVIDOR ---
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
