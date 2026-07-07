import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 15000,
  auth: {
    user: process.env.SMTP_Email,
    pass: process.env.SMTP_PASS,
  },
});

export const getMailStatus = () => ({
  configured: Boolean(process.env.SMTP_Email && process.env.SMTP_PASS),
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
});

export const SendMail = async (toEmail, subject, text, OTP) => {
  if (!process.env.SMTP_Email || !process.env.SMTP_PASS) {
    const error = new Error('SMTP credentials are not configured');
    error.statusCode = 503;
    error.publicMessage = 'Email service is not configured. Please contact support.';
    throw error;
  }

  const startedAt = Date.now();

  try {
    console.log(`Sending OTP email to ${toEmail} through ${SMTP_HOST}:${SMTP_PORT}`);
    const info = await transporter.sendMail({
      from: `"Expense Tracker App" <${process.env.SMTP_Email}>`,
      to: toEmail,
      subject,
      text: `${text} ${OTP}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 30px; background: #f9f9f9;">
          <h2 style="color: #4f46e5; text-align: center;">OTP Verification</h2>
          <p style="font-size: 16px; color: #333;">${text}</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #4f46e5; background: #eef2ff; padding: 12px 24px; border-radius: 8px;">${OTP}</span>
          </div>
          <p style="font-size: 13px; color: #888; text-align: center;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">Expense Tracker App &copy; 2026</p>
        </div>
      `,
    });
    console.log(`Email sent in ${Date.now() - startedAt}ms:`, info.messageId);
    return info;
  } catch (err) {
    console.error(`Email send failed after ${Date.now() - startedAt}ms:`, {
      code: err.code,
      command: err.command,
      message: err.message,
    });
    err.statusCode = err.statusCode || 502;
    err.publicMessage =
      err.publicMessage ||
      'Login details are valid, but the OTP email could not be sent. Please try again shortly.';
    throw err;
  }
};
