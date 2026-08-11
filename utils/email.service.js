import nodemailer from "nodemailer";

const isSmtpConfigured = () =>
    Boolean(
        process.env.SMTP_HOST &&
            process.env.SMTP_USER &&
            process.env.SMTP_PASS
    );

let transporter = null;

const getTransporter = () => {
    if (!isSmtpConfigured()) return null;

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    return transporter;
};

export const sendVerificationEmail = async ({ to, name, token }) => {
    const appUrl = (process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "");
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

    const subject = "Verify your clinic account email";
    const html = `
        <p>Hi ${name},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify email</a></p>
        <p>Or copy this link: ${verifyUrl}</p>
        <p>This link expires in 24 hours.</p>
    `;

    const transport = getTransporter();

    if (!transport) {
        console.log("[email] SMTP not configured. Verification link:", verifyUrl);
        return { sent: false, verifyUrl };
    }

    await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html
    });

    return { sent: true, verifyUrl: null };
};
