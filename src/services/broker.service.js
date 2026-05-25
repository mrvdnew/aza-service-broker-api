import sql from 'mssql';
import { handleNewAlert } from '../controllers/alertController.js';

export const listenToQueue = async (configBroker) => {
    try {
        const pool = await sql.connect(configBroker);
        console.log("Listener de Service Broker conectado a Pruebas_SI...");

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
                const alarmData = JSON.parse(rawMessage);

                console.log("\n[Broker] ¡Nueva alarma detectada!");
                console.log(`-> TAG:   ${alarmData.Tag}`);
                console.log(`-> VALOR: ${alarmData.Valor}`);
                console.log(`-> FECHA: ${alarmData.Fecha}`);
                
                await handleNewAlert(alarmData);
            }
        }
    } catch (err) {
        console.error("Error en el Listener:", err.message);
        setTimeout(() => listenToQueue(configBroker), 5000); 
    }
};