import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const AuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No authorization header provided' });
    }

    const parts = authHeader.split(' ');
    const token =
      parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0];

    if (!token || token === 'undefined' || token === 'null') {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    if (!process.env.secretkey) {
      return res.status(500).json({ success: false, message: 'JWT secret is not configured' });
    }

    const decoded = jwt.verify(token, process.env.secretkey);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
