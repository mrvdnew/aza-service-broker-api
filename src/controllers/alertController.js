// src/controllers/alertController.js
import sql                   from 'mssql';
import { sendAlertEmail }    from '../services/email.service.js';
import { getPool }           from '../config/db.js'; // Ruta corregida

export const handleNewAlert = async (alarmData) => {
    const { Tag, Valor, Fecha } = alarmData;

    try {
        console.log(`\nProcesando tag: ${Tag} | Valor: ${Valor}`);

        const pool = await getPool();

        const result = await pool.request()
            .input('tag',   sql.NVarChar(50), Tag)
            .input('valor', sql.Float,        Valor)
            .query(`
                SELECT
                    u.id,
                    u.nombre,
                    u.email,
                    ut.umbral_min,
                    ut.umbral_max
                FROM usuarios u
                JOIN usuarios_tags ut ON ut.usuario_id = u.id
                WHERE ut.tag_nombre   = @tag
                  AND ut.activo       = 1
                  AND u.activo        = 1
                  AND ut.alerta_email = 1
                  AND (
                      (ut.umbral_max IS NOT NULL AND @valor > ut.umbral_max) OR
                      (ut.umbral_min IS NOT NULL AND @valor < ut.umbral_min) OR
                      (ut.umbral_min IS NULL AND ut.umbral_max IS NULL)
                  )
            `);

        const usuarios = result.recordset;

        if (usuarios.length === 0) {
            console.log(`Sin usuarios para notificar para ${Tag} = ${Valor}`);
            return;
        }

        console.log(`${usuarios.length} usuario(s) detectado(s) para notificar`);

        for (const usuario of usuarios) {
            const tipoAlerta = calcularTipoAlerta(Valor, usuario.umbral_min, usuario.umbral_max);

            console.log(`  → Enviando correo a: ${usuario.email} | ${tipoAlerta}`);

            await sendAlertEmail({
                ...alarmData,
                UsuarioNombre: usuario.nombre,
                UsuarioEmail:  usuario.email,
                TipoAlerta:    tipoAlerta
            });

            await registrarLog(pool, {
                usuarioId:  usuario.id,
                tag:        Tag,
                valor:      Valor,
                tipoAlerta
            });
        }

    } catch (error) {
        console.error('Error en handleNewAlert:', error.message);
    }
};

function calcularTipoAlerta(valor, umbralMin, umbralMax) {
    if (umbralMax !== null && valor > umbralMax) return `ALTO — supera máximo (${umbralMax})`;
    if (umbralMin !== null && valor < umbralMin) return `BAJO — bajo mínimo (${umbralMin})`;
    return 'Notificación directa (sin umbral)';
}

async function registrarLog(pool, { usuarioId, tag, valor, tipoAlerta }) {
    try {
        await pool.request()
            .input('usuarioId',  sql.Int,          usuarioId)
            .input('tag',        sql.NVarChar(50),  tag)
            .input('valor',      sql.Float,         valor)
            .input('tipoAlerta', sql.NVarChar(100), tipoAlerta)
            .query(`
                INSERT INTO alertas_log (usuario_id, tag_nombre, valor, tipo_alerta)
                VALUES (@usuarioId, @tag, @valor, @tipoAlerta)
            `);
    } catch (err) {
        console.error('Error al registrar log:', err.message);
    }
}