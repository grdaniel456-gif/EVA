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

        // 2. Asegurar que existan todas las columnas necesarias (incluyendo el historial)
        await pool.query(`
            ALTER TABLE alumnos 
            ADD COLUMN IF NOT EXISTS password VARCHAR(100),
            ADD COLUMN IF NOT EXISTS genero VARCHAR(1),
            ADD COLUMN IF NOT EXISTS modalidad VARCHAR(1),
            ADD COLUMN IF NOT EXISTS historial_asistencias TEXT[] DEFAULT '{}';
        `);

        console.log('Tabla "alumnos" en PostgreSQL inicializada correctamente con historial, genero y modalidad.');
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

// --- 4. RUTA DE REGISTRO DE ALUMNOS (Letras y Números - 8 Caracteres) ---
app.post('/api/registro', async (req, res) => {
    let { matricula, nombre, password, genero, modalidad } = req.body;

    if (!matricula || !nombre || !password || !genero || !modalidad) {
        return res.status(400).send(`
            <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                Todos los campos son obligatorios.
            </h1>
            <p style="text-align: center;"><a href="javascript:history.back()">Volver</a></p>
        `);
    }

    // Validación 1: Matrícula exactamente de 8 caracteres (Letras y/o Números)
    const regexMatricula = /^[a-zA-Z0-9]{8}$/;
    if (!regexMatricula.test(matricula)) {
        return res.status(400).send(`
            <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                La matrícula debe contener exactamente 8 caracteres (letras y números).
            </h1>
            <p style="text-align: center;"><a href="javascript:history.back()">Volver</a></p>
        `);
    }

    // Validación 2: Género debe ser 'H' o 'M'
    genero = genero.toUpperCase();
    if (genero !== 'H' && genero !== 'M') {
        return res.status(400).send(`
            <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                El género debe ser H (Hombre) o M (Mujer).
            </h1>
            <p style="text-align: center;"><a href="javascript:history.back()">Volver</a></p>
        `);
    }

    // Validación 3: Modalidad debe ser 'D' (Dual) o 'N' (Normal)
    modalidad = modalidad.toUpperCase();
    if (modalidad !== 'D' && modalidad !== 'N') {
        return res.status(400).send(`
            <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                La modalidad debe ser D (Dual) o N (Normal).
            </h1>
            <p style="text-align: center;"><a href="javascript:history.back()">Volver</a></p>
        `);
    }

    try {
        await pool.query(
            'INSERT INTO alumnos (matricula, nombre, password, genero, modalidad, asistencias, historial_asistencias) VALUES ($1, $2, $3, $4, $5, 0, $6)',
            [matricula.toUpperCase(), nombre, password, genero, modalidad, []]
        );
        // Redirección exitosa al index de inicio de sesión
        return res.redirect('/index.html');
    } catch (err) {
        if (err.code === '23505') { // Clave duplicada
            return res.status(400).send(`
                <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                    La matrícula ya está registrada.
                </h1>
                <p style="text-align: center;"><a href="javascript:history.back()">Volver a intentar</a></p>
            `);
        }
        console.error('Error en /api/registro:', err);
        return res.status(500).send(`
            <h1 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #d9534f;">
                Error interno al registrar alumno.
            </h1>
            <p style="text-align: center;"><a href="javascript:history.back()">Volver</a></p>
        `);
    }
});

// --- 5. RUTA DE LOGIN ---
app.post('/login', async (req, res) => {
    let { rol, matricula, nombre, password } = req.body;

    if (rol === 'estudiante') {
        try {
            const result = await pool.query(
                'SELECT * FROM alumnos WHERE UPPER(matricula) = $1 AND password = $2',
                [matricula.toUpperCase(), password]
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

// --- 6. RUTA API: ESCANEO Y REGISTRO DE ASISTENCIA CON HISTORIAL DETALLADO ---
app.post('/api/registrar-asistencia', async (req, res) => {
    let { matricula, token } = req.body;

    if (!token || token !== tokenActivoActual) {
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'El código QR ya no es válido o ya fue escaneado.' 
        });
    }

    try {
        matricula = matricula.toUpperCase();

        // 1. Obtener alumno actual
        const alumnoResult = await pool.query(
            'SELECT asistencias FROM alumnos WHERE UPPER(matricula) = $1',
            [matricula]
        );

        if (alumnoResult.rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'El estudiante no existe en la base de datos.' });
        }

        const asistenciasActuales = alumnoResult.rows[0].asistencias || 0;
        const numAsistencia = asistenciasActuales + 1;

        // 2. Formatear la fecha y hora en ZONA HORARIA LOCAL (México)
        const fechaHoraLocal = new Date().toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        // Convierte el formato devuelto "30/08/2026, 08:35" a "30-08-2026-08:35"
        const [fechaParte, horaParte] = fechaHoraLocal.split(', ');
        const fechaFormateada = `${fechaParte.replace(/\//g, '-')}-${horaParte}`;
        
        const nuevoRegistro = `asistencia ${numAsistencia}: ${fechaFormateada}`;

        // 3. Sumar +1 y agregar registro en PostgreSQL
        const updateResult = await pool.query(
            `UPDATE alumnos 
             SET asistencias = asistencias + 1,
                 historial_asistencias = array_append(COALESCE(historial_asistencias, '{}'), $1)
             WHERE UPPER(matricula) = $2 
             RETURNING *`,
            [nuevoRegistro, matricula]
        );

        const alumno = updateResult.rows[0];

        // 4. Quemar token viejo y notificar docente
        tokenActivoActual = generarTokenUnico();
        io.emit('actualizar_qr', { 
            token: tokenActivoActual,
            ultimoAlumno: matricula 
        });

        return res.json({
            exito: true,
            mensaje: `¡Asistencia registrada para ${alumno.nombre}! (${nuevoRegistro})`,
            totalAsistencias: alumno.asistencias,
            historial: alumno.historial_asistencias
        });

    } catch (err) {
        console.error('Error en PostgreSQL:', err);
        return res.status(500).json({ exito: false, mensaje: 'Error al registrar la asistencia.' });
    }
});

// --- 7. CONSULTAR LISTA DE ALUMNOS ---
app.get('/api/alumnos', async (req, res) => {
    try {
        const result = await pool.query('SELECT matricula, nombre, asistencias, genero, modalidad, historial_asistencias FROM alumnos ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ exito: false, mensaje: err.message });
    }
});
// --- RUTA PARA EL SEGUIMIENTO DE ASISTENCIAS ---
app.get('/api/seguimiento', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT matricula, nombre, asistencias, genero, historial_asistencias FROM alumnos'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener datos de seguimiento:', err);
        res.status(500).json({ exito: false, mensaje: 'Error al consultar la base de datos' });
    }
});

// --- 8. ARRANCAR SERVIDOR ---
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});