import multer from 'multer';

const storage = multer.memoryStorage();

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (imageMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP).'));
  }
};

export const uploadProfilePic = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});
