import express from 'express';
import 'dotenv/config'; 
import { listenToQueue } from './src/services/broker.service.js';

const app = express();
const PORT = process.env.PORT || 3000;

const configBroker = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: 'Pruebas_SI', 
    requestTimeout: 0, 
    options: {
        encrypt: false, 
        trustServerCertificate: true
    }
};

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en el puerto ${PORT}`);
    listenToQueue(configBroker);
});