import sql from 'mssql';

const config = {
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server:   process.env.DB_SERVER,
    database: 'Pruebas_SI',
    options: {
        encrypt:                false,
        trustServerCertificate: true, 
        enableArithAbort:       true
    },
    pool: {
        max:               10,
        min:               2,
        idleTimeoutMillis: 30000
    }
};

let pool;

export const getPool = async () => {
    if (!pool) {
        pool = await sql.connect(config);
        console.log('Pool de usuarios conectado');
    }
    return pool;
};