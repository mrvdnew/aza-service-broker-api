export const sendAlertEmail = async (alarmData) => {
    try {
        const { default: nodemailer } = await import('nodemailer');

        const gmailUser = process.env.EMAIL_GMAIL_USER;
        const gmailAppPassword = process.env.EMAIL_GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailAppPassword) {
            throw new Error('Faltan EMAIL_GMAIL_USER o EMAIL_GMAIL_APP_PASSWORD en el entorno.');
        }

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #dcdcdc; padding: 20px; border-radius: 5px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d9534f; margin-top: 0;">ALERTA DE SISTEMA - CRÍTICO</h2>
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
            </div>
        `;

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: gmailUser,
                pass: gmailAppPassword
            }
        });

        const toEmail = alarmData.UsuarioEmail || process.env.EMAIL_TEST_DESTINO;

        if (!toEmail) {
            throw new Error('No hay destinatario. Define UsuarioEmail o EMAIL_TEST_DESTINO.');
        }

        const mailOptions = {
            from: gmailUser,
            to: toEmail,
            subject: `ALERTA: ${alarmData.Tag} | ${alarmData.TipoAlerta || 'Notificacion'}`,
            text: `ALERTA DE SISTEMA\nTAG: ${alarmData.Tag}\nVALOR: ${alarmData.Valor}\nFECHA: ${alarmData.Fecha}`,
            html: htmlBody
        };

        const maxAttempts = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                await transporter.sendMail(mailOptions);
                console.log(`Envio exitoso a ${toEmail}`);
                lastError = null;
                break;
            } catch (sendError) {
                lastError = sendError;
                console.error(`Error en el envio (intento ${attempt}/${maxAttempts}): ${sendError.message}`);

                if (attempt < maxAttempts) {
                    const delayMs = attempt * 1500;
                    console.log(`Reintentando en ${delayMs} ms...`);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        }

        if (lastError) {
            throw lastError;
        }
        
    } catch (error) {
        console.error(`Error en el envio: ${error.message}`);
    }
};