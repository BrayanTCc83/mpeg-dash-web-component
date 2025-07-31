import { stat, createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

import cookieParser from 'cookie-parser';
import JSONWebToken from 'jsonwebtoken';
import express from "express";
import cors from "cors";

const PORT = 4000;
const COOKIE = 'example_video_dash';
const PRIVATE_KEY = '89ece160-3663-4bb3-a0fd-4ddf8da93cc8';

const app = express();
const fileInfo = promisify(stat);
const expiryDate = new Date(Date.now() + 60 * 60 * 1000 * 24 * 7);

import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
    
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    allowedHeaders: ['Content-Type', 'Accept'],
    methods: 'GET, POST, PATCH, DELETE, PUT',
    origin: ['http://localhost:5500'],
    credentials: true
}));

const validarToken = (req, res, next) => {
    if(!req.cookies || !req.cookies[COOKIE]) {
      return res.status(400).json({ mensaje: "Cookie requerida no encontrada" });
    }

    const sesion = req.cookies[COOKIE];

    const data = JSONWebToken.verify( sesion, PRIVATE_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                error: 'Token no válido o expirado'
            });
        }

        req.user = decoded;
        next();
    }); 
}

app.post('/sesion', (request, res) => {
    const { user, password } = request.body;

    if(user !== 'video-dash' || password !== '12345678') {
        return res.status(400).send({ message: 'Error en usuario o contraseña.' })
    }

    const token = JSONWebToken.sign(
        { nombre: user },
        PRIVATE_KEY,
        { expiresIn: '7d' }
    );

    res.cookie(COOKIE, token, {
        httpOnly: true,
        secure: false,
        sameSite: 'none',
        expires: expiryDate
    });

    res.status(200).json({
        mensaje: 'Sesión iniciada correctamente.'
    });
});

app.get('/tema/:idTema/recurso', async (request, res) => {
    const idTema = request.params.idTema;
    const media = request.headers.accept;
    if(media === 'application/dash+xml') {
        const archivo = path.join(__dirname, `../assets/${idTema}/manifest.mpd`);
        res.status(200).sendFile(archivo);
    }else if(media.startsWith('video/webm')) {
        const resolution = media.split('format=')[1];
        const artificialDelay = Math.round(Math.random() * Math.random() * 1000);
        setTimeout(() => {
            const archivo = path.join(__dirname, `../assets/${idTema}/${resolution}.webm`);
            res.status(206).sendFile(archivo);
        }, artificialDelay);
    }else if(media.startsWith('audio/webm')) {
        const archivo = path.join(__dirname, `../assets/${idTema}/audio.webm`);
        const { size } = await fileInfo(archivo);
        const range = request.headers.range;

        let [ start, end ] = range.replace(/bytes=/, "").split('-');
        start = Number.parseInt(start, 10);
        end = end ? Number.parseInt(end, 10) : size - 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-ranges': "bytes",
            'Content-Length': end - start + 1,
            'Content-Type': 'audio/webm'
        })

        let legible = createReadStream(archivo, { start, end });
        pipeline(legible, res, err => {
            console.log(err);
        })
    }
    else res.status(404);
});

app.use('/tema/:idTema/recurso', (request, res, _) => {
    const idTema = request.params.idTema;
});

app.use('/assets', express.static('assets'));

app.listen(PORT, () => {
    console.log(`Aplicación escuchando en el puerto ${PORT}`);
});