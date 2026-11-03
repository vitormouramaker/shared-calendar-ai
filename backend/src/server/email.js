const nodemailer = require("nodemailer");

const APP_NAME = process.env.APP_NAME || "Calendo";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function isSmtpConfigured() {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && fromAddress,
  );
}

async function sendPasswordResetCode(email, code) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!isSmtpConfigured()) {
    // Sem SMTP o e-mail não sai da máquina. Em desenvolvimento o código aparece
    // no console da API para dar para testar o fluxo; em produção ele nunca é
    // impresso.
    if (process.env.NODE_ENV === "production") {
      console.error("[email] SMTP não configurado: código de recuperação não enviado.");
    } else {
      console.warn("[email] SMTP não configurado (modo log). Código de recuperação:", {
        email,
        code,
      });
    }

    return {
      delivered: false,
      mode: "log",
    };
  }

  await transporter.sendMail({
    from: `"${APP_NAME}" <${fromAddress}>`,
    to: email,
    subject: "Código de recuperação de senha",
    text: `Seu código de recuperação é ${code}. Ele expira em 15 minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">Recuperação de senha</h2>
        <p>Use o código abaixo para redefinir a sua senha no app:</p>
        <div style="margin: 20px 0; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #6D28D9;">
          ${code}
        </div>
        <p>Esse código expira em 15 minutos.</p>
        <p>Se você não solicitou essa recuperação, ignore este e-mail.</p>
      </div>
    `,
  });

  console.log("[email] password reset code delivered");

  return {
    delivered: true,
    mode: "smtp",
  };
}

module.exports = {
  sendPasswordResetCode,
};
