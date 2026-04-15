import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand-col">
          <span className="footer-logo">SacredMatch</span>
          <p className="footer-desc">
            Defining the next generation of matrimonial connections through editorial
            elegance and deep trust.
          </p>
        </div>
        <div className="footer-col">
          <h4>Platform</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/search">Search Profiles</Link></li>
            <li><Link to="/register">Register</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Contact Info</a></li>
            <li><a href="#">Safety Center</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Connect</h4>
          <div className="footer-socials">
            <a href="#" className="social-icon">
              <span className="material-symbols-outlined">public</span>
            </a>
            <a href="#" className="social-icon">
              <span className="material-symbols-outlined">mail</span>
            </a>
            <a href="#" className="social-icon">
              <span className="material-symbols-outlined">share</span>
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2024 SacredMatch. All rights reserved.</p>
      </div>
    </footer>
  );
}
