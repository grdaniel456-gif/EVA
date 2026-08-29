const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const Datastore = require('nedb-promises');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. BASE DE DATOS (NeDB - 100% JS Puro para Render) ---
const dbAlumnos = Datastore.create({ filename: path.join(__dirname, 'alumnos.db'), autoload: true });

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

// --- 4. RUTA DE REGISTRO DE ALUMNOS ---
app.post('/api/registro', async (req, res) => {
    const { matricula, nombre } = req.body;

    if (!matricula || !nombre) {
        return res.status(400).json({ exito: false, mensaje: 'Matrícula y nombre son requeridos.' });
    }

    try {
        const existe = await dbAlumnos.findOne({ _id: matricula });
        if (existe) {
            return res.status(400).json({ exito: false, mensaje: 'La matrícula ya está registrada.' });
        }

        await dbAlumnos.insert({ _id: matricula, nombre, asistencias: 0 });
        res.json({ exito: true, mensaje: 'Estudiante registrado correctamente.' });
    } catch (err) {
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

// --- 6. RUTA API: ESCANEO Y REGISTRO DE ASISTENCIA (+1) ---
// --- 6. RUTA API: ESCANEO Y REGISTRO DE ASISTENCIA (+1 CON AUTO-BÚSQUEDA) ---
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
        // Intentar buscar al alumno en la base de datos NeDB
        let alumno = await dbAlumnos.findOne({ _id: matricula });

        // 💡 SI NO EXISTE EN NEDB, LO BUSCAMOS EN estudiantes.json Y LO CREAMOS
        if (!alumno) {
            const estudiantesJSON = leerJSON('estudiantes.json');
            const enJSON = estudiantesJSON.find(e => e.matricula === matricula);
            
            // Si estaba en el JSON usamos su nombre real, si no, le asignamos uno por defecto
            const nombreAlumno = enJSON ? enJSON.nombre : `Estudiante ${matricula}`;

            // Crear el registro en la base de datos con su primera asistencia (+1)
            alumno = await dbAlumnos.insert({ 
                _id: matricula, 
                nombre: nombreAlumno, 
                asistencias: 1 
            });
        } else {
            // Si ya existía en NeDB, le incrementamos +1
            await dbAlumnos.update({ _id: matricula }, { $inc: { asistencias: 1 } });
        }

        // 2. Quemar el token QR e informar al docente por WebSocket en tiempo real
        tokenActivoActual = generarTokenUnico();
        io.emit('actualizar_qr', { 
            token: tokenActivoActual,
            ultimoAlumno: matricula 
        });

        // 3. Obtener el registro actualizado para devolver el conteo exacto
        const alumnoActualizado = await dbAlumnos.findOne({ _id: matricula });

        res.json({
            exito: true,
            mensaje: `¡Asistencia registrada para ${alumnoActualizado.nombre}!`,
            totalAsistencias: alumnoActualizado.asistencias
        });

    } catch (err) {
        console.error('Error al registrar asistencia:', err);
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor al actualizar asistencia.' });
    }
});

// --- 7. CONSULTAR BASE DE DATOS DE ALUMNOS ---
app.get('/api/alumnos', async (req, res) => {
    try {
        const alumnos = await dbAlumnos.find({});
        res.json(alumnos);
    } catch (err) {
        res.status(500).json({ exito: false, mensaje: err.message });
    }
});

// --- 8. ARRANCAR SERVIDOR ---
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});