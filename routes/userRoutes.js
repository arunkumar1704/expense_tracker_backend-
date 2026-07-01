import express from 'express';
import { register, LoginPage, VerifyOtp, getProfile } from '../controllers/userController.js';
import { AuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', LoginPage);
router.post('/login/verify', VerifyOtp);

// Protected routes
router.get('/me', AuthMiddleware, getProfile);

export default router;
