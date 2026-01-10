import { prisma } from "./prisma";
import nodemailer from "nodemailer";

/**
 * Utility for sending emails.
 * Uses SMTP configuration from environment variables or database settings.
 */
export async function sendEmail({
    to,
    subject,
    html,
    attachments
}: {
    to: string;
    subject: string;
    html: string;
    attachments?: any[];
}) {
    // 1. Fetch dynamic settings from DB
    const settings = await prisma.systemSetting.findMany({
        where: { group: 'EMAIL' }
    });

    const getSetting = (key: string) => settings.find(s => s.key === key)?.value;

    const host = getSetting('SMTP_HOST') || process.env.SMTP_HOST;
    const port = parseInt(getSetting('SMTP_PORT') || process.env.SMTP_PORT || "587");
    const user = getSetting('SMTP_USER') || process.env.SMTP_USER;
    const pass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;
    const from = getSetting('SMTP_FROM') || process.env.SMTP_FROM || user;
    const redirectEmail = getSetting('EMAIL_REDIRECT_GLOBAL');

    let finalTo = to;
    let isRedirected = false;

    // 2. Handle global redirection
    if (redirectEmail && redirectEmail.trim() !== '') {
        finalTo = redirectEmail;
        isRedirected = true;
        subject = `[REDIRECTED from ${to}] ${subject}`;
    }

    if (!host || !user || !pass) {
        const error = "Missing SMTP configuration.";
        console.warn(`[MAIL] ${error} Falling back to console simulation.`);

        await prisma.emailLog.create({
            data: {
                to: finalTo,
                subject,
                status: 'SIMULATED',
                error: isRedirected ? `Original recipient: ${to}` : undefined
            }
        });

        console.log("==========================================");
        console.log(`[SIMULACIÓN EMAIL] ${isRedirected ? '(REDIRECCIONADO)' : ''}`);
        console.log(`Para: ${finalTo}`);
        console.log(`Asunto: ${subject}`);
        console.log("------------------------------------------");
        console.log(html);
        console.log("==========================================");
        return { success: true, simulated: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass,
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });

        const info = await transporter.sendMail({
            from: `"AM Manager" <${from}>`,
            to: finalTo,
            subject,
            html,
            attachments
        });

        // 3. Log success
        await prisma.emailLog.create({
            data: {
                to: finalTo,
                subject,
                status: 'SUCCESS',
                messageId: info.messageId,
                content: html,
                error: isRedirected ? `Original recipient: ${to}` : undefined
            }
        });

        console.log(`[MAIL] Email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err: any) {
        // 4. Log failure
        await prisma.emailLog.create({
            data: {
                to: finalTo,
                subject,
                status: 'FAILED',
                error: `${err.message || String(err)}${isRedirected ? ` | Original recipient: ${to}` : ''}`,
                content: html
            }
        });

        console.error("[MAIL] Error sending email:", err);
        return { success: false, error: err };
    }
}

export function getPasswordResetTemplate(resetLink: string) {
    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #333; margin: 0;">AM Manager</h1>
            </div>
            <h2 style="color: #333;">Recuperación de contraseña</h2>
            <p>Has solicitado restablecer tu contraseña en AM Manager.</p>
            <p>Haz clic en el siguiente botón para continuar:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
            </div>
            <p style="color: #666; font-size: 14px;">Este enlace es de un solo uso y caducará en 1 hora.</p>
            <p style="color: #666; font-size: 14px;">Si no has solicitado este cambio, por favor ignora este email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} AM Manager</p>
        </div>
    `;
}
