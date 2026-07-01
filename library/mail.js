import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_Email,
    pass: process.env.SMTP_PASS,
  },
});

export const SendMail = async (toEmail, subject, text, OTP) => {
  try {
    const info = await transporter.sendMail({
      from: `"Expense Tracker App" <${process.env.SMTP_Email}>`,
      to: toEmail,
      subject: subject,
      text: `${text} ${OTP}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 30px; background: #f9f9f9;">
          <h2 style="color: #4f46e5; text-align: center;">🔐 OTP Verification</h2>
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
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Email send failed:', err);
    throw err;
  }
};

