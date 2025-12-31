/**
 * Utility for sending emails.
 * Currently simulates sending by logging to console.
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    console.log("==========================================");
    console.log(`[SIMULACIÓN EMAIL]`);
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log("------------------------------------------");
    console.log("Cuerpo:");
    console.log(html);
    console.log("==========================================");

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return { success: true };
}

export function getPasswordResetTemplate(resetLink: string) {
    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Recuperación de contraseña</h2>
            <p>Has solicitado restablecer tu contraseña en AM Manager.</p>
            <p>Haz clic en el siguiente botón para continuar:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
            </div>
            <p style="color: #666; font-size: 14px;">Este enlace es de un solo uso y caducará en 1 hora.</p>
            <p style="color: #666; font-size: 14px;">Si no has solicitado este cambio, por favor ignora este email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} AM Manager</p>
        </div>
    `;
}
