import { logger } from "./logger";

interface OtpEmailOptions {
  to: string;
  otp: string;
  subject: string;
}

const luxuryHtml = (otp: string, subject: string) => `
  <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 40px; background: #0a0a0a; color: #f5f5f5;">
    <h1 style="color: #c9a84c; font-size: 28px; margin-bottom: 8px;">LXLunettes</h1>
    <p style="color: #a8a8b3; margin-bottom: 32px; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">Administration</p>
    <h2 style="font-size: 16px; font-weight: normal; color: #f5f5f5; margin-bottom: 24px;">${subject}</h2>
    <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <p style="font-size: 13px; color: #a8a8b3; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 2px;">Votre code</p>
      <p style="font-size: 44px; font-weight: bold; letter-spacing: 14px; color: #c9a84c; margin: 0;">${otp}</p>
    </div>
    <p style="color: #a8a8b3; font-size: 13px;">Valable pendant <strong>10 minutes</strong>. Ne partagez ce code avec personne.</p>
    <hr style="border-color: #333; margin: 32px 0;" />
    <p style="color: #555; font-size: 11px;">LXLunettes — Accès administration sécurisé</p>
  </div>
`;

export async function sendOtpEmail({ to, otp, subject }: OtpEmailOptions): Promise<void> {
  // The admin mailbox is also the default sender, so local and hosted
  // environments do not require two copies of the same Gmail address.
  const gmailUser = process.env.GMAIL_USER || process.env.ADMIN_EMAIL;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const resendKey = process.env.RESEND_API_KEY;

  if (gmailUser && gmailPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });

      await transporter.sendMail({
        from: `"LXLunettes Admin" <${gmailUser}>`,
        to,
        subject,
        html: luxuryHtml(otp, subject),
      });
      logger.info({ to, via: "gmail" }, "OTP email sent");
      return;
    } catch (err) {
      logger.error({ err }, "Gmail SMTP failed, trying next provider");
    }
  }

  if (resendKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: "LXLunettes <noreply@lxlunettes.com>",
        to,
        subject,
        html: luxuryHtml(otp, subject),
      });
      if (error) throw error;
      logger.info({ to, via: "resend" }, "OTP email sent");
      return;
    } catch (err) {
      logger.error({ err }, "Resend failed");
    }
  }

  // Do not tell the UI that Gmail received a code when every provider failed.
  logger.error({ to }, "No working OTP email provider is configured");
  throw new Error("Aucun service d’envoi d’e-mail OTP n’est disponible");
}
