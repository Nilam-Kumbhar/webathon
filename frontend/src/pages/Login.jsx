import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill all fields'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="login-page">
        <div className="login-bg-circle login-bg-circle-1"></div>
        <div className="login-bg-circle login-bg-circle-2"></div>

        <div className="login-container fade-in">
          <div className="login-card">
            <div className="login-header">
              <h1>Welcome Back</h1>
              <p>Continue your journey to finding your soul's reflection.</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email" type="email" placeholder="name@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <div className="form-group-header">
                  <label htmlFor="password">Password</label>
                </div>
                <input
                  id="password" type="password" placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
            </form>

            <div className="login-footer">
              <p>Don't have an account yet? <Link to="/register">Create an account</Link></p>
            </div>
          </div>

          <div className="login-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
