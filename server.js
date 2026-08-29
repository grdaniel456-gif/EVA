const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. CONEXIÓN A POSTGRESQL ---
// Toma la URL automáticamente desde Render o la variable de entorno
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://eva_db_n0jc_user:zosdPzPXVx0e8Rw8ePgibu144pkn8WYX@dpg-da9io1hf2nfc73fmjdeg-a/eva_db_n0jc',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Crear tabla de alumnos automáticamente si no existe
pool.query(`
    CREATE TABLE IF NOT EXISTS alumnos (
        matricula VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        asistencias INT DEFAULT 0
    );
`).then(() => console.log('Tabla "alumnos" en PostgreSQL lista.'))
  .catch(err => console.error('Error inicializando PostgreSQL:', err));


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

// --- 3. WEBSOCKETS (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('Cliente conectado por WebSocket');

    socket.on('solicitar_nuevo_qr', () => {
        tokenActivoActual = generarTokenUnico();
        socket.emit('actualizar_qr', { token: tokenActivoActual });
    });
});

// --- 4. RUTA DE REGISTRO DE ALUMNOS ---
app.post('/api/registro', async (req, res) => {
    const { matricula, nombre } = req.body;

    if (!matricula || !nombre) {
        return res.status(400).json({ exito: false, mensaje: 'Matrícula y nombre son requeridos.' });
    }

    try {
        await pool.query(
            'INSERT INTO alumnos (matricula, nombre, asistencias) VALUES ($1, $2, 0)',
            [matricula, nombre]
        );
        res.json({ exito: true, mensaje: 'Estudiante registrado correctamente en la base de datos.' });
    } catch (err) {
        if (err.code === '23505') { // Código de error de clave duplicada en PG
            return res.status(400).json({ exito: false, mensaje: 'La matrícula ya está registrada.' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error al registrar alumno.' });
    }
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
        // Buscar alumno en PostgreSQL
        let result = await pool.query('SELECT * FROM alumnos WHERE matricula = $1', [matricula]);
        let alumno = result.rows[0];

        // Si no existe en PG, lo creamos con su nombre de estudiantes.json
        if (!alumno) {
            const estudiantesJSON = leerJSON('estudiantes.json');
            const enJSON = estudiantesJSON.find(e => e.matricula === matricula);
            const nombreAlumno = enJSON ? enJSON.nombre : `Estudiante ${matricula}`;

            const insertResult = await pool.query(
                'INSERT INTO alumnos (matricula, nombre, asistencias) VALUES ($1, $2, 1) RETURNING *',
                [matricula, nombreAlumno]
            );
            alumno = insertResult.rows[0];
        } else {
            // Si ya existe, le sumamos +1 asistencia
            const updateResult = await pool.query(
                'UPDATE alumnos SET asistencias = asistencias + 1 WHERE matricula = $1 RETURNING *',
                [matricula]
            );
            alumno = updateResult.rows[0];
        }

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

// --- 7. CONSULTAR BASE DE DATOS DE ALUMNOS ---
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
























