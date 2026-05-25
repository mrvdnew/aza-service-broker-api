// src/controllers/alertController.js
import sql                   from 'mssql';
import { sendAlertEmail }    from '../services/email.service.js';
import { getPool }           from '../config/db.js'; // Ruta corregida

export const handleNewAlert = async (alarmData) => {
    const { Tag, Valor, Fecha } = alarmData;

    try {
        console.log(`\n[Controlador] Procesando tag: ${Tag} | Valor: ${Valor}`);

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
                LEFT JOIN planificacion_diaria pd ON pd.usuario_id = u.id AND pd.fecha = CONVERT(DATE, GETDATE())
                LEFT JOIN turnos t ON (u.es_personal_4x4 = 1 AND pd.turno_id = t.id) OR (u.es_personal_4x4 = 0 AND t.nombre_turno = 'ADMINISTRATIVO')
                WHERE ut.tag_nombre   = @tag
                  AND ut.activo       = 1
                  AND u.activo        = 1
                  AND ut.alerta_email = 1
                  AND (
                      -- Caso 1: Operador 4x4 Mañana o Tarde (Horarios normales de planta)
                      (u.es_personal_4x4 = 1 AND t.hora_inicio <= t.hora_fin 
                       AND CONVERT(TIME, GETDATE()) BETWEEN t.hora_inicio AND t.hora_fin)
                      
                      OR
                      
                      -- Caso 2: Operador 4x4 Noche (Cruza la medianoche)
                      (u.es_personal_4x4 = 1 AND t.hora_inicio > t.hora_fin 
                       AND (CONVERT(TIME, GETDATE()) >= t.hora_inicio OR CONVERT(TIME, GETDATE()) <= t.hora_fin))
                      
                      OR
                      
                      -- Caso 3: Administrativo Lunes a Martes (08:00 a 17:00)
                      (u.es_personal_4x4 = 0 
                       AND DATEPART(dw, GETDATE()) IN (2, 3) 
                       AND CONVERT(TIME, GETDATE()) BETWEEN '08:00:00' AND '17:00:00')
                      
                      OR
                      
                      -- Caso 4: Administrativo Miércoles a Viernes (08:00 a 16:30)
                      (u.es_personal_4x4 = 0 
                       AND DATEPART(dw, GETDATE()) IN (4, 5, 6) 
                       AND CONVERT(TIME, GETDATE()) BETWEEN '08:00:00' AND '16:30:00')
                  )
                  AND (
                      (ut.umbral_max IS NOT NULL AND @valor > ut.umbral_max) OR
                      (ut.umbral_min IS NOT NULL AND @valor < ut.umbral_min) OR
                      (ut.umbral_min IS NULL AND ut.umbral_max IS NULL)
                  )
            `);

        const usuarios = result.recordset;

        if (usuarios.length === 0) {
            console.log(`[Controlador] Sin usuarios en turno o rango para notificar para ${Tag} = ${Valor}`);
            return;
        }

        console.log(`[Controlador] ${usuarios.length} usuario(s) detectado(s) en turno activo`);

        for (const usuario of usuarios) {
            const tipoAlerta = calcularTipoAlerta(Valor, usuario.umbral_min, usuario.umbral_max);

            // Esto imprimirá el correo real en consola, pero la salida será el archivo local .html
            console.log(`  → Generando simulación local para: ${usuario.email} | ${tipoAlerta}`);

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
        console.error('[Controlador] Error en handleNewAlert:', error.message);
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
        console.error('[Controlador] Error al registrar log:', err.message);
    }
}