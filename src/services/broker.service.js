import sql from 'mssql';
import { handleNewAlert } from '../controllers/alertController.js';

export const listenToQueue = async (configBroker) => {
    try {
        const pool = await sql.connect(configBroker);
        console.log("Conectado a Pruebas_SI...");
        let consecutiveErrors = 0;

        while (true) {
            const result = await pool.request().query(`
                WAITFOR (
                    RECEIVE TOP(1) 
                    CAST(message_body AS NVARCHAR(MAX)) AS body
                    FROM [Cola_Notificaciones_Alertas]
                ), TIMEOUT 60000;
            `);

            if (result.recordset.length > 0 && result.recordset[0].body) {
                const rawMessage = result.recordset[0].body;
                const rawLength = typeof rawMessage === 'string' ? rawMessage.length : 0;

                if (rawLength > 10000) {
                    console.error("Mensaje demasiado grande, se omite. Largo:", rawLength);
                    continue;
                }

                let alarmData;

                try {
                    alarmData = JSON.parse(rawMessage);
                } catch (parseError) {
                    console.error("JSON invalido en la cola:", parseError.message);
                    continue;
                }

                if (!alarmData || !alarmData.Tag || alarmData.Valor === undefined || !alarmData.Fecha) {
                    console.error("Mensaje incompleto, se omite:", rawMessage);
                    continue;
                }

                console.log("\n[Broker] ¡Nueva alarma detectada!");
                console.log(`-> TAG:   ${alarmData.Tag}`);
                console.log(`-> VALOR: ${alarmData.Valor}`);
                console.log(`-> FECHA: ${alarmData.Fecha}`);
                
                await handleNewAlert(alarmData);
                consecutiveErrors = 0;
            }
        }
    } catch (err) {
        console.error("Error en el Listener:", err.message);
        consecutiveErrors += 1;
        const backoffMs = Math.min(30000, 5000 * consecutiveErrors);
        setTimeout(() => listenToQueue(configBroker), backoffMs); 
    }
};