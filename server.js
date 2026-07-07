import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { DB_connection, getDbStatus, isDbConnected } from './config/db.js';
import { getMailStatus, transporter } from './library/mail.js';
import UserRouter from './routes/userRoutes.js';
import ExpenseRouter from './routes/expenseRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = express();
const PORT = process.env.PORT || 2001;

const allowedOrigins =
  process.env.ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

const isAllowedVercelPreview = (origin) =>
  /^https:\/\/expense-tracker-frontend(-[a-z0-9-]+)?\.vercel\.app$/.test(origin);

console.log('Allowed Origins:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      isAllowedVercelPreview(origin) ||
      /^https?:\/\/localhost:\d+$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }

    const error = new Error(`CORS policy: origin not allowed (${origin})`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

server.use(cors(corsOptions));
server.options('*', cors(corsOptions));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(`[API] --> ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    console.log(
      `[API] <-- ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`
    );
  });

  next();
});

server.use('/image', express.static(path.join(__dirname, 'uploads')));

server.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Expense Tracker Server is running',
    port: PORT,
  });
});

server.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: getDbStatus(),
    mail: getMailStatus(),
    environment: process.env.NODE_ENV || 'development',
  });
});

const requireDatabase = (req, res, next) => {
  if (isDbConnected()) return next();

  return res.status(503).json({
    success: false,
    message: 'Database is not connected yet. Please try again in a few seconds.',
    database: getDbStatus(),
  });
};

server.use('/api', requireDatabase, UserRouter);
server.use('/api/expense', requireDatabase, ExpenseRouter);

server.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

server.use((err, req, res, next) => {
  console.error('Unhandled exception:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

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

  if (err.message?.startsWith('CORS policy')) {
    return res.status(err.statusCode || 403).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.publicMessage || err.message || 'Internal server error',
  });
});

const httpServer = server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  DB_connection().catch((error) => {
    console.error('MongoDB startup connection failed:', error.message);
  });

  transporter.verify((error) => {
    if (error) {
      console.warn('Nodemailer verification failed:', error.message);
      return;
    }

    console.log('Nodemailer is ready to send emails');
  });
});

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Please stop the conflicting process or use a different PORT.`
    );
    process.exit(1);
  }

  console.error('Server error:', error);
  process.exit(1);
});
