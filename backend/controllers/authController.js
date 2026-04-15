import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { findUserByEmailWithPassword } from '../models/User.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const toPublicUser = (userDoc) => {
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  return obj;
};

/**
 * Auth Controller — lightweight mock login endpoint.
 */
export const mockLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = findUserByEmailWithPassword(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, age, gender, education, job, salary, religion, caste, bio, interests } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      age,
      gender,
      education,
      job,
      salary,
      religion,
      caste,
      bio,
      interests: Array.isArray(interests) ? interests : [],
    });

    const token = signToken(user._id);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    return res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
};
