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

// --- 1. CONEXIÓN E INICIALIZACIÓN DE POSTGRESQL ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://eva_db_n0jc_user:zosdPzPXVx0e8Rw8ePgibu144pkn8WYX@dpg-da9io1hf2nfc73fmjdeg-a/eva_db_n0jc',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Inicializar tabla de alumnos en PostgreSQL
const inicializarBD = async () => {
    try {
        // 1. Crear tabla base si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS alumnos (
                matricula VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                asistencias INT DEFAULT 0
            );
        `);

        // 2. Asegurar que existan las columnas requeridas
        await pool.query(`
            ALTER TABLE alumnos 
            ADD COLUMN IF NOT EXISTS password VARCHAR(100),
            ADD COLUMN IF NOT EXISTS genero VARCHAR(1),
            ADD COLUMN IF NOT EXISTS modalidad VARCHAR(1);
        `);

        console.log('Tabla "alumnos" en PostgreSQL inicializada con genero y modalidad.');
    } catch (err) {
        console.error('Error inicializando PostgreSQL:', err);
    }
};

inicializarBD();

// Leer JSON para Docentes
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

// --- 4. RUTA DE REGISTRO DE ALUMNOS (Con validaciones de Genero, Modalidad y Matricula de 8 dígitos) ---
app.post('/api/registro', async (req, res) => {
    let { matricula, nombre, password, genero, modalidad } = req.body;

    if (!matricula || !nombre || !password || !genero || !modalidad) {
        return res.status(400).json({ exito: false, mensaje: 'Todos los campos son obligatorios.' });
    }

    // Validación 1: Matrícula exactamente de 8 dígitos numéricos
    const regexMatricula = /^\d{8}$/;
    if (!regexMatricula.test(matricula)) {
        return res.status(400).json({ exito: false, mensaje: 'La matrícula debe contener exactamente 8 dígitos numéricos.' });
    }

    // Validación 2: Género debe ser 'H' o 'M'
    genero = genero.toUpperCase();
    if (genero !== 'H' && genero !== 'M') {
        return res.status(400).json({ exito: false, mensaje: 'El género debe ser H (Hombre) o M (Mujer).' });
    }

    // Validación 3: Modalidad debe ser 'D' (Dual) o 'N' (Normal)
    modalidad = modalidad.toUpperCase();
    if (modalidad !== 'D' && modalidad !== 'N') {
        return res.status(400).json({ exito: false, mensaje: 'La modalidad debe ser D (Dual) o N (Normal).' });
    }

    try {
        await pool.query(
            'INSERT INTO alumnos (matricula, nombre, password, genero, modalidad, asistencias) VALUES ($1, $2, $3, $4, $5, 0)',
            [matricula, nombre, password, genero, modalidad]
        );
        res.json({ exito: true, mensaje: 'Estudiante registrado correctamente.' });
    } catch (err) {
        if (err.code === '23505') { // Clave duplicada
            return res.status(400).json({ exito: false, mensaje: 'La matrícula ya está registrada.' });
        }
        console.error('Error en /api/registro:', err);
        res.status(500).json({ exito: false, mensaje: 'Error interno al registrar alumno.' });
    }
});

// --- 5. RUTA DE LOGIN ---
app.post('/login', async (req, res) => {
    const { rol, matricula, nombre, password } = req.body;

    if (rol === 'estudiante') {
        try {
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

// --- 6. RUTA API: ESCANEO Y REGISTRO DE ASISTENCIA ---
app.post('/api/registrar-asistencia', async (req, res) => {
    const { matricula, token } = req.body;

    if (!token || token !== tokenActivoActual) {
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'El código QR ya no es válido o ya fue escaneado.' 
        });
    }

    try {
        const updateResult = await pool.query(
            'UPDATE alumnos SET asistencias = asistencias + 1 WHERE matricula = $1 RETURNING *',
            [matricula]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'El estudiante no existe en la base de datos.' });
        }

        const alumno = updateResult.rows[0];

        tokenActivoActual = generarTokenUnico();
        io.emit('actualizar_qr', { 
            token: tokenActivoActual,
            ultimoAlumno: matricula 
        });

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
        const result = await pool.query('SELECT matricula, nombre, asistencias, genero, modalidad FROM alumnos ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ exito: false, mensaje: err.message });
    }
});

// --- 8. ARRANCAR SERVIDOR ---
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});