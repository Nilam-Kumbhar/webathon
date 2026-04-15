import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Middleware
import errorHandler from './middleware/errorHandler.js';

// Route modules (advanced features)
import matchRoutes from './routes/matchRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import safetyRoutes from './routes/safetyRoutes.js';
import horoscopeRoutes from './routes/horoscopeRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/user.js';
import interestRoutes from './routes/interestRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

// Socket.io
import { initChatSocket } from './socket/chatSocket.js';

// __dirname polyfill for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // tighten in production
    methods: ['GET', 'POST'],
  },
});

// ─── Global middleware ───────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api', safetyRoutes);           // /api/report, /api/block, /api/block/list
app.use('/api/horoscope', horoscopeRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interest', interestRoutes);
app.use('/api/chat', chatRoutes);

// ─── 404 handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ─── Error handler (must be last) ────────────────────────
app.use(errorHandler);

// ─── Start server ────────────────────────────────────────
const PORT = process.env.PORT || 9080;

const start = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set in environment variables.');
    }
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set in environment variables.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Initialize Socket.io chat system
    initChatSocket(io);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`💬 Socket.io ready on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
