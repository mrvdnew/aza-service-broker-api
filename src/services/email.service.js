import fs from 'fs';
import path from 'path';

export const sendAlertEmail = async (alarmData) => {
    console.log(" [Email] 1. Entrando a la función sendAlertEmail..."); 

    try {
        console.log(" [Email] 2. Generando el diseño HTML del correo...");

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #dcdcdc; padding: 20px; border-radius: 5px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d9534f; margin-top: 0;">⚠️ ALERTA DE SISTEMA - CRÍTICO</h2>
                <hr style="border: 0; border-top: 1px solid #eeeeee;" />
                <p>Se ha detectado un valor fuera de rango en el monitoreo de planta:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f9f9f9;">
                        <td style="padding: 8px; font-weight: bold; width: 30%;">TAG:</td>
                        <td style="padding: 8px; color: #d9534f; font-weight: bold;">${alarmData.Tag}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;">VALOR:</td>
                        <td style="padding: 8px; font-weight: bold;">${alarmData.Valor}</td>
                    </tr>
                    <tr style="background: #f9f9f9;">
                        <td style="padding: 8px;">FECHA:</td>
                        <td style="padding: 8px;">${alarmData.Fecha}</td>
                    </tr>
                </table>
                <hr style="border: 0; border-top: 1px solid #eeeeee;" />
                <p style="font-size: 12px; color: #777777; margin-bottom: 0;">
                    Simulación local: Este archivo representa el correo que se enviará al Outlook configurado: ${process.env.EMAIL_TEST_DESTINO}
                </p>
            </div>
        `;

        const nombreArchivo = `correo_alerta_${alarmData.Tag}.html`;
        const rutaDestino = path.join(process.cwd(), nombreArchivo);

        console.log(" [Email] 3. Escribiendo el archivo HTML en el disco local...");
        
        fs.writeFileSync(rutaDestino, htmlBody, 'utf-8');

        console.log(`\n [Email] Simulación Exitosa. Archivo generado en:\n ${rutaDestino}\n`);
        
    } catch (error) {
        console.error(" [Email] Error en la simulación:", error.message);
    }
};