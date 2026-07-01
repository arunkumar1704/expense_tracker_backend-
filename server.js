import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { DB_connection } from './config/db.js';
import { transporter } from './library/mail.js';
import UserRouter from './routes/userRoutes.js';
import ExpenseRouter from './routes/expenseRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = express();
const PORT = process.env.PORT || 2001;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174']
const allowedOrigins = process.env.ORIGIN?.split(',') || [];
console.log('Allowed Origins:', allowedOrigins);
server.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/localhost:\d+$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true,
  })
);
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// ─── STATIC FILES (Uploaded Images) ──────────────────────────────────────────
server.use('/image', express.static(path.join(__dirname, 'uploads')));

// ─── DATABASE ─────────────────────────────────────────────────────────────────

DB_connection();

// ─── ROUTES ───────────────────────────────────────────────────────────────────
server.use('/api', UserRouter);
server.use('/api/expense', ExpenseRouter);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
server.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🟢 Expense Tracker Server is running',
    port: PORT,
  });
});

// ─── NODEMAILER VERIFY ────────────────────────────────────────────────────────
try {
  await transporter.verify();
  console.log('✅ Nodemailer is ready to send emails');
} catch (err) {
  console.warn(
    '⚠️  Nodemailer verification failed (check SMTP credentials):',
    err.message
  );
}

// ─── ERROR HANDLING ──────────────────────────────────────────────────────────
server.use((err, req, res, next) => {
  console.error('Unhandled exception:', err);

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file is too large. Max size is 5MB.'
        : err.message;

    return res.status(400).json({
      success: false,
      message,
      error: err.code,
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const httpServer = server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `❌ Port ${PORT} is already in use. Please stop the conflicting process or use a different PORT.`
    );
    process.exit(1);
  }

  console.error('Server error:', error);
  process.exit(1);
});
