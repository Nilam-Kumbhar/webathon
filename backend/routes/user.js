import express from 'express';
import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadProfilePic } from '../middleware/upload.js';

const router = express.Router();

const allowedUpdateFields = [
  'name',
  'age',
  'gender',
  'education',
  'job',
  'salary',
  'religion',
  'caste',
  'bio',
  'interests',
];

router.get('/me', protect, async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch profile.', error: error.message });
  }
});

router.put('/update', protect, async (req, res) => {
  try {
    const updates = {};
    for (const key of allowedUpdateFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select(
      '-password'
    );

    return res.status(200).json({ message: 'Profile updated.', user });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update profile.', error: error.message });
  }
});

router.post('/upload-profile-pic', protect, (req, res, next) => {
  uploadProfilePic.single('profilePic')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 2MB.' });
      }
      return res.status(400).json({ message: err.message || 'Upload failed.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({ message: 'Image upload is not configured. Set Cloudinary environment variables.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Use field name "profilePic".' });
    }

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'marriage-bureau/profiles',
      resource_type: 'image',
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: result.secure_url },
      { new: true }
    ).select('-password');

    return res.status(200).json({
      message: 'Profile picture updated.',
      profilePic: user.profilePic,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not upload profile picture.', error: error.message });
  }
});

export default router;
