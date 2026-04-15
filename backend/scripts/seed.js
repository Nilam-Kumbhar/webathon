import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

// Import db to initialize tables
import '../db.js';
import { createUser, deleteAllUsers } from '../models/User.js';
import { createReport, deleteAllReports } from '../models/Report.js';
import { deleteAllInterests } from '../models/Interest.js';
import { deleteAllMessages } from '../models/Message.js';
import { deleteAllMatchResults } from '../models/MatchResult.js';

/**
 * Seed script — populates the SQLite database with sample data.
 *
 * Run:  node scripts/seed.js
 */
const sampleUsers = [
  {
    name: 'Priya Sharma', email: 'priya@example.com', password: 'password123',
    gender: 'female', dateOfBirth: new Date('1997-03-15'), city: 'Mumbai',
    state: 'Maharashtra', country: 'India', education: 'MBA',
    occupation: 'Marketing Manager',
    bio: 'Love traveling and exploring new cultures. Looking for a partner who shares my curiosity.',
    interests: ['travel', 'cooking', 'reading', 'yoga', 'photography'],
    preferredAgeMin: 25, preferredAgeMax: 35, preferredCity: 'Mumbai',
    preferredEducation: 'MBA', role: 'user',
  },
  {
    name: 'Rahul Verma', email: 'rahul@example.com', password: 'password123',
    gender: 'male', dateOfBirth: new Date('1995-07-22'), city: 'Mumbai',
    state: 'Maharashtra', country: 'India', education: 'B.Tech',
    occupation: 'Software Engineer',
    bio: 'Tech enthusiast and weekend trekker. Believe in honest communication.',
    interests: ['coding', 'trekking', 'reading', 'cooking', 'music'],
    preferredAgeMin: 23, preferredAgeMax: 32, preferredCity: 'Mumbai',
    preferredEducation: 'MBA', role: 'user',
  },
  {
    name: 'Ananya Patel', email: 'ananya@example.com', password: 'password123',
    gender: 'female', dateOfBirth: new Date('1998-11-05'), city: 'Pune',
    state: 'Maharashtra', country: 'India', education: 'B.Tech',
    occupation: 'Data Analyst',
    bio: 'Data nerd by day, dancer by night. Looking for someone who can keep up!',
    interests: ['dancing', 'data science', 'cooking', 'travel', 'fitness'],
    preferredAgeMin: 24, preferredAgeMax: 34, preferredCity: 'Pune',
    preferredEducation: 'B.Tech', role: 'user',
  },
  {
    name: 'Vikram Singh', email: 'vikram@example.com', password: 'password123',
    gender: 'male', dateOfBirth: new Date('1993-01-30'), city: 'Delhi',
    state: 'Delhi', country: 'India', education: 'MBA',
    occupation: 'Business Analyst',
    bio: 'Fitness freak and entrepreneur. Looking for a life partner who values ambition.',
    interests: ['fitness', 'business', 'travel', 'photography', 'cooking'],
    preferredAgeMin: 22, preferredAgeMax: 30, preferredCity: 'Delhi',
    preferredEducation: 'MBA', role: 'user',
  },
  {
    name: 'Sneha Iyer', email: 'sneha@example.com', password: 'password123',
    gender: 'female', dateOfBirth: new Date('1996-06-18'), city: 'Bangalore',
    state: 'Karnataka', country: 'India', education: 'M.Sc',
    occupation: 'Researcher',
    bio: 'Science enthusiast with a love for classical music. Quiet evenings > loud parties.',
    interests: ['research', 'music', 'reading', 'yoga', 'painting'],
    preferredAgeMin: 26, preferredAgeMax: 36, preferredCity: 'Bangalore',
    preferredEducation: 'M.Sc', role: 'user',
  },
  {
    name: 'Arjun Mehta', email: 'arjun@example.com', password: 'password123',
    gender: 'male', dateOfBirth: new Date('1994-09-12'), city: 'Pune',
    state: 'Maharashtra', country: 'India', education: 'B.Tech',
    occupation: 'Product Manager',
    bio: 'Product guy who builds things. Love dogs, coffee, and long drives.',
    interests: ['product management', 'coffee', 'dogs', 'driving', 'cooking'],
    preferredAgeMin: 23, preferredAgeMax: 31, preferredCity: 'Pune',
    preferredEducation: 'B.Tech', role: 'user',
  },
  {
    name: 'Kavya Reddy', email: 'kavya@example.com', password: 'password123',
    gender: 'female', dateOfBirth: new Date('1999-02-28'), city: 'Hyderabad',
    state: 'Telangana', country: 'India', education: 'B.Com',
    occupation: 'CA Aspirant',
    bio: 'Numbers are my thing. Looking for someone who loves deep conversations.',
    interests: ['finance', 'reading', 'movies', 'travel', 'sketching'],
    preferredAgeMin: 24, preferredAgeMax: 33, preferredCity: 'Hyderabad',
    preferredEducation: 'B.Com', role: 'user',
  },
  {
    name: 'Admin User', email: 'admin@example.com', password: 'admin123',
    gender: 'male', dateOfBirth: new Date('1990-01-01'), city: 'Mumbai',
    state: 'Maharashtra', country: 'India', education: 'MBA',
    occupation: 'Platform Admin',
    bio: 'Platform administrator account.',
    interests: [], role: 'admin',
  },
];

async function seed() {
  try {
    // Clear existing data (order matters for foreign keys)
    deleteAllMessages();
    deleteAllMatchResults();
    deleteAllInterests();
    deleteAllReports();
    deleteAllUsers();
    console.log('🗑️  Cleared existing data');

    // Hash passwords and create users
    const createdUsers = [];
    for (const u of sampleUsers) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      const user = createUser({ ...u, password: hashedPassword });
      createdUsers.push(user);
    }
    console.log(`👥 Created ${createdUsers.length} users`);

    // Create sample reports
    const [priya, , ananya, vikram] = createdUsers;
    createReport({
      reportedBy: priya._id, reportedUser: vikram._id,
      reason: 'spam', description: 'Sending repetitive messages',
    });
    createReport({
      reportedBy: ananya._id, reportedUser: vikram._id,
      reason: 'harassment', description: 'Inappropriate language in chat',
    });
    console.log('🚩 Created sample reports');

    console.log('\n── Sample Login Credentials ──');
    console.log('User:  priya@example.com / password123');
    console.log('User:  rahul@example.com / password123');
    console.log('Admin: admin@example.com / admin123');
    console.log('\n✅ Seed complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
