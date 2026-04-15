import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import './Register.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', gender: '',
    dateOfBirth: '', religion: '', education: '', job: '',
    city: '', bio: '',
  });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Name, email, and password are required.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="register-page">
        <div className="register-inner">
          <div className="register-hero fade-in">
            <div className="register-glow"></div>
            <h1>Your Sacred <span>Story</span><br /> Begins Here.</h1>
            <p>Join a sanctuary designed for intentional connections and lifelong unions.</p>
          </div>

          <div className="register-card fade-in-delay-1">
            {error && <div className="register-error">{error}</div>}

            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Full Name</label>
                  <input type="text" placeholder="Enter your name" value={form.name} onChange={set('name')} />
                </div>
                <div className="form-field">
                  <label>Email Address</label>
                  <input type="email" placeholder="name@example.com" value={form.email} onChange={set('email')} />
                </div>
                <div className="form-field">
                  <label>Password</label>
                  <input type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} />
                </div>
                <div className="form-field">
                  <label>Gender Identity</label>
                  <select value={form.gender} onChange={set('gender')}>
                    <option value="">Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
                </div>
                <div className="form-field">
                  <label>Faith / Religion</label>
                  <input type="text" placeholder="e.g. Hindu, Christian" value={form.religion} onChange={set('religion')} />
                </div>
                <div className="form-field">
                  <label>Highest Education</label>
                  <input type="text" placeholder="e.g. Masters in CS" value={form.education} onChange={set('education')} />
                </div>
                <div className="form-field">
                  <label>Profession</label>
                  <input type="text" placeholder="e.g. Software Engineer" value={form.job} onChange={set('job')} />
                </div>
                <div className="form-field full-width">
                  <label>Current Location</label>
                  <div className="field-with-icon">
                    <span className="material-symbols-outlined">location_on</span>
                    <input type="text" placeholder="City, Country" value={form.city} onChange={set('city')} />
                  </div>
                </div>
                <div className="form-field full-width">
                  <label>About You</label>
                  <textarea placeholder="Tell us about yourself..." rows="3" value={form.bio} onChange={set('bio')} />
                </div>
              </div>

              <div className="register-submit">
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create My Profile'}
                  {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                </button>
              </div>
            </form>
          </div>

          <div className="register-login-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
