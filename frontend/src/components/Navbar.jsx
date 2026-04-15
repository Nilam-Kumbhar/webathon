import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../api/api';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    chatAPI.getUnread().then(d => setUnread(d.unreadCount || 0)).catch(() => {});
    const interval = setInterval(() => {
      chatAPI.getUnread().then(d => setUnread(d.unreadCount || 0)).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">Milan Setu</Link>

        <button className="navbar-mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
        </button>

        <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <li><NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink></li>
          {user && <li><NavLink to="/search" onClick={() => setMenuOpen(false)}>Search Profiles</NavLink></li>}
          {user && <li><NavLink to="/interests" onClick={() => setMenuOpen(false)}>Interests</NavLink></li>}
          {user && (
            <li className="navbar-unread">
              <NavLink to="/chat" onClick={() => setMenuOpen(false)}>
                Chat
              </NavLink>
              {unread > 0 && <span className="unread-badge">{unread > 9 ? '9+' : unread}</span>}
            </li>
          )}
          {user?.role === 'admin' && <li><NavLink to="/admin" onClick={() => setMenuOpen(false)}>Admin</NavLink></li>}
        </ul>

        <div className="navbar-actions">
          {!user ? (
            <>
              <Link to="/login"><button className="btn-login">Login</button></Link>
              <Link to="/register"><button className="btn-register">Register</button></Link>
            </>
          ) : (
            <div className="navbar-user">
              <Link to="/dashboard" className="navbar-avatar">
                {user.profilePic || user.profilePhoto ? (
                  <img src={user.profilePic || user.profilePhoto} alt={user.name} />
                ) : initials}
              </Link>
              <button className="btn-logout" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
