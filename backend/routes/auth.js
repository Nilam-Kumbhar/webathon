import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
<<<<<<< HEAD
import User from '../models/User.js';
import { registerUser } from '../controllers/authController.js';
=======
import {
  findUserByEmail, findUserByEmailWithPassword, createUser,
} from '../models/User.js';
>>>>>>> dd4b5205f6259ced26d90ef94a68a2050533e2d7

const router = express.Router();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const toPublicUser = (user) => {
  const obj = { ...user };
  delete obj.password;
  return obj;
};

router.get('/test', (req, res) => res.send('Auth working'));

router.post('/register', async (req, res) => {
<<<<<<< HEAD
  console.log('POST /api/auth/register hit');
  console.log('Register request body:', req.body);
  return registerUser(req, res);
=======
  try {
    const {
      name, email, password, age, gender, education,
      job, salary, religion, caste, bio, interests,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = createUser({
      name, email, password: hashedPassword,
      age, gender, education, job, salary, religion, caste, bio,
      interests: Array.isArray(interests) ? interests : [],
    });

    const token = signToken(user._id);
    return res.status(201).json({
      message: 'Registration successful.',
      token, user: toPublicUser(user),
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    return res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
>>>>>>> dd4b5205f6259ced26d90ef94a68a2050533e2d7
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = findUserByEmailWithPassword(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    return res.status(200).json({
      message: 'Login successful.',
      token, user: toPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

export default router;
