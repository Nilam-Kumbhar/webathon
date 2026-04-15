import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    age: { type: Number },
    gender: { type: String, trim: true },
    education: { type: String, trim: true },
    job: { type: String, trim: true },
    salary: { type: Number },
    religion: { type: String, trim: true },
    caste: { type: String, trim: true },
    bio: { type: String, trim: true },
    interests: [{ type: String, trim: true }],
    profilePic: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
