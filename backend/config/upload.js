import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

/**
 * Multer configuration for file uploads.
 *
 * Two separate upload instances:
 *  - `documentUpload` → for ID verification documents (images/pdf)
 *  - `videoUpload`    → for video intro files
 *
 * Files are saved to /uploads/{verification,videos}/ with UUID filenames
 * to prevent collisions and path-traversal attacks.
 */

// Ensure upload directories exist
const dirs = ['uploads/verification', 'uploads/videos'];
dirs.forEach((dir) => {
  const fullPath = path.resolve(dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// ─── Document upload (images + PDFs) ────────────────────

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/verification'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only JPEG, PNG, or PDF files are allowed'));
  },
});

// ─── Video upload ───────────────────────────────────────

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/videos'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mov|avi|webm/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    if (extOk) return cb(null, true);
    cb(new Error('Only MP4, MOV, AVI, or WebM files are allowed'));
  },
});
