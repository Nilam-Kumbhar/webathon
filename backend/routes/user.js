import express from 'express';
import cloudinary from '../config/cloudinary.js';
import { findUserById, updateUser } from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadProfilePic } from '../middleware/upload.js';

const router = express.Router();

const allowedUpdateFields = [
  'name', 'age', 'gender', 'dateOfBirth', 'city', 'state', 'country',
  'education', 'occupation', 'job', 'salary', 'religion', 'caste', 'bio',
  'interests', 'preferredAgeMin', 'preferredAgeMax', 'preferredCity',
  'preferredEducation', 'preferredJob', 'preferredReligion', 'preferredCaste',
  'lifestylePreferences',
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

    const user = await updateUser(req.user._id, updates);
    return res.status(200).json({ message: 'Profile updated.', user });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update profile.', error: error.message });
  }
});

router.get('/preferences', protect, async (req, res) => {
  try {
    const user = await findUserById(req.user._id);
    return res.status(200).json({
      preferences:
        user.partnerPreferences && Object.keys(user.partnerPreferences).length > 0
          ? user.partnerPreferences
          : {
              ageRange: {
                min: user.preferredAgeMin || 18,
                max: user.preferredAgeMax || 60,
              },
              location: { city: user.preferredCity || '' },
              education: user.preferredEducation || '',
              job: user.preferredJob || '',
              religion: user.preferredReligion || '',
              caste: user.preferredCaste || '',
              lifestyle: user.lifestylePreferences || [],
            },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Could not fetch preferences.', error: error.message,
    });
  }
});

router.put('/preferences', protect, async (req, res) => {
  try {
    const { ageRange, location, education, job, religion, caste, lifestyle } = req.body;
    const currentUser = req.user;

    const min = ageRange?.min;
    const max = ageRange?.max;
    if ((min !== undefined || max !== undefined) && Number(min) > Number(max)) {
      return res.status(400).json({
        message: 'Invalid age range: min age cannot be greater than max age.',
      });
    }

    const partnerPreferences = {
      ageRange: {
        min: min !== undefined ? Number(min)
          : currentUser.partnerPreferences?.ageRange?.min ?? currentUser.preferredAgeMin ?? 18,
        max: max !== undefined ? Number(max)
          : currentUser.partnerPreferences?.ageRange?.max ?? currentUser.preferredAgeMax ?? 60,
      },
      location: {
        city: location?.city ?? currentUser.partnerPreferences?.location?.city
          ?? currentUser.preferredCity ?? '',
        state: location?.state ?? currentUser.partnerPreferences?.location?.state ?? '',
        country: location?.country ?? currentUser.partnerPreferences?.location?.country ?? '',
      },
      education: education ?? currentUser.partnerPreferences?.education
        ?? currentUser.preferredEducation ?? '',
      job: job ?? currentUser.partnerPreferences?.job ?? currentUser.preferredJob ?? '',
      religion: religion ?? currentUser.partnerPreferences?.religion
        ?? currentUser.preferredReligion ?? '',
      caste: caste ?? currentUser.partnerPreferences?.caste ?? currentUser.preferredCaste ?? '',
      lifestyle: Array.isArray(lifestyle) ? lifestyle
        : currentUser.partnerPreferences?.lifestyle ?? currentUser.lifestylePreferences ?? [],
    };

    const updates = {
      partnerPreferences,
      preferredAgeMin: partnerPreferences.ageRange.min,
      preferredAgeMax: partnerPreferences.ageRange.max,
      preferredCity: partnerPreferences.location.city,
      preferredEducation: partnerPreferences.education,
      preferredJob: partnerPreferences.job,
      preferredReligion: partnerPreferences.religion,
      preferredCaste: partnerPreferences.caste,
      lifestylePreferences: partnerPreferences.lifestyle,
    };

    const user = await updateUser(req.user._id, updates);
    return res.status(200).json({
      message: 'Partner preferences updated successfully.',
      preferences: user.partnerPreferences,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Could not update preferences.', error: error.message,
    });
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
      return res.status(500).json({
        message: 'Image upload is not configured. Set Cloudinary environment variables.',
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Use field name "profilePic".' });
    }

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'marriage-bureau/profiles',
      resource_type: 'image',
    });

    const user = await updateUser(req.user._id, { profilePic: result.secure_url });

    return res.status(200).json({
      message: 'Profile picture updated.',
      profilePic: user.profilePic,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Could not upload profile picture.', error: error.message,
    });
  }
});

export default router;
