import User from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SendMail } from '../library/mail.js';
import dotenv from 'dotenv';
dotenv.config();

// ─── REGISTER ────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully! Please login.',
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ─── LOGIN (Send OTP) ─────────────────────────────────────────────────────────
export const LoginPage = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found. Please register.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp.toString();
    user.otpExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    await SendMail(user.email, 'Your OTP - Expense Tracker', 'Your OTP for login is:', otp);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your registered email. Valid for 5 minutes.',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────
export const VerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    if (!user.otp) {
      return res
        .status(400)
        .json({ success: false, message: 'No OTP found. Please login again.' });
    }

    if (new Date() > new Date(user.otpExpire)) {
      user.otp = null;
      user.otpExpire = null;
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP expired. Please login again.' });
    }

    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    if (!process.env.secretkey) {
      return res.status(500).json({ success: false, message: 'JWT secret is not configured' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.secretkey, {
      expiresIn: '1d',
    });

    user.otp = null;
    user.otpExpire = null;
    await user.save();

    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
      message: 'Login successful! Welcome back.',
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
};

// ─── GET PROFILE ──────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpire');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};
