import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import './Home.css';

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <main className="home-page">
        {/* ── Hero ─────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-bg">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr-PxSNy8Y4j0MkBuviAXGeJbavlVHsf4zm2c9ZKDaDSKiUoTsK67wesBJ0w3Adn-bXLCML6UMUlIxpKWvNKdKj_nkcQif96pesgYwuxp6GNHdvt-Epefm-LIuLJpzfuqkHG1FDwHwACRhI5GvKCcT1lg7iDJQz8JPVDxQNWaDOIUP-I5p3_NVLQGAO9z8bOaV70MLEF-8rQsK_Hy_ML4f-sizJuvEATl2_A2luQjn3G1FW_4cIraV2R3GI5BzY0wqD0AHtICp-r3Z"
              alt="Luxurious traditional wedding ceremony"
            />
            <div className="hero-overlay"></div>
          </div>
          <div className="hero-content fade-in">
            <h1>Find Your Perfect <br /><span className="hero-accent">Life Partner</span></h1>
            <p>
              Join the most trusted matrimonial platform for modern Indian families.
              We curate connections that respect tradition and embrace the future.
            </p>
            <div className="hero-actions">
              {!user ? (
                <>
                  <Link to="/register" className="btn-primary-lg">Create Profile</Link>
                  <Link to="/search" className="btn-secondary-lg">Search Matches</Link>
                </>
              ) : (
                <>
                  <Link to="/search" className="btn-primary-lg">Search Matches</Link>
                  <Link to="/dashboard" className="btn-secondary-lg">My Dashboard</Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────── */}
        <section className="features">
          <div className="features-grid">
            {[
              { icon: 'verified_user', title: 'Verified Profiles', desc: 'Every member is manually verified by our team to ensure the highest quality of authentic connections.' },
              { icon: 'lock', title: 'Privacy Protected', desc: 'Your data and photos are kept secure with advanced privacy controls you can customize at any time.' },
              { icon: 'family_restroom', title: 'Trusted by Families', desc: 'A platform built with family values in mind, helping parents and children find the right union together.' },
            ].map((f, i) => (
              <div className={`feature-card fade-in-delay-${i + 1}`} key={f.icon}>
                <div className="feature-icon">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────── */}
        <section className="how-it-works">
          <div className="how-inner">
            <div className="section-header">
              <span className="section-label">The Journey</span>
              <h2>How It Works</h2>
            </div>
            <div className="steps-grid">
              {[
                { num: '1', icon: 'how_to_reg', title: 'Sign Up', desc: 'Create your profile with details about your background, career, and lifestyle.' },
                { num: '2', icon: 'tune', title: 'Set Preferences', desc: 'Define what you are looking for in a partner through our detailed filters.' },
                { num: '3', icon: 'favorite', title: 'Connect', desc: 'Start meaningful conversations with matches that resonate with your soul.' },
              ].map(s => (
                <div className="step" key={s.num}>
                  <div className="step-number">{s.num}</div>
                  <span className="material-symbols-outlined step-icon">{s.icon}</span>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Success Stories ────────────────────────────  */}
        <section className="success-stories">
          <div className="stories-header">
            <div>
              <span className="section-label">Destiny Realized</span>
              <h2>Success Stories</h2>
            </div>
          </div>
          <div className="stories-grid">
            {[
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdlnhIsNQkfKFt-8zYxBUYaEp6Xg15FPzC791_FdvhVrBZzWVAQLYqcqmhs14FWiBZjIB8ekRQ7XJFQjUxj7sFspGqyKR2deHxrULXgq1ftjYh1QUHJ_8LxJE7iGmTE_tUutRxXQwHP9BSgR22aEscY3F6K62zzmYSW3wUlRAGkQ4PNUp1ZyVGv1GibQ1Q4_0idfANojmztR665HgC-s2xEg4YExG1ChdhEBQwYId_u2YNoFmsZcBONOirv1uXp1tWsmw4T8CGaB7O',
                names: 'Arjun & Priya',
                quote: '"SacredMatch understood our family values perfectly. Within two months, I found someone who feels like home."',
                date: 'MATCHED IN FEB 2024',
              },
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS_TPLFHrWnBRAHCki5WXrwhujSKZ9O-W9vuAOjruJ34PqfyunyXUPTVQ_hPKLphyKka0RmFJjUKb5sK-a5mWaeZc3JP0UB_0NpGPsn6Mq4kGtgiA1n16BCVEtOmifNLkGdcGqxG63VrcA9WkAdXU3rPtOVBioatDARWzrPR9yEv85OaGowp6645CwEu3CyLvUqJW6auAhvRiPM19K89Y7Ds8eNmZO2ybqV3X2tUlvNekLxHUEpBGGUAJu5bF_zEnRJK6qoL_FN2YJ',
                names: 'Rohan & Meera',
                quote: '"We were both career-focused and struggling to meet like-minded people. SacredMatch bridged that gap effortlessly."',
                date: 'MATCHED IN NOV 2023',
                offset: true,
              },
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzf8rDHjv4U9RF45HxjDHtEUs1zkG7DhFdKJCBkvrdu6RxP2KfRwThAJlbnaD8NyPhgQ5UtyG04dtCntUOUQW0kl9EBAIU_TGbXFqFn1aHunl1Jvca7cgTRsaCAQXjd9Rr_LxZZjf3t5x6S4xrNHwlRCnW4OnUz6dK06pGh4qfesT9OsRD2iq0Jf0goqGczpIcnLKhP7__vBo0A9ZnNjrxi-CqIsmNYLIx-HF3uMUGu2blaUUsgApCOML4eZO4VAtbGPD1WfuxOT2r',
                names: 'Vikram & Ananya',
                quote: '"The compatibility tools helped us realize we shared the same outlook on life before we even met in person."',
                date: 'MATCHED IN JAN 2024',
              },
            ].map(s => (
              <div className={`story-card ${s.offset ? 'story-offset' : ''}`} key={s.names}>
                <div className="story-img"><img src={s.img} alt={s.names} /></div>
                <div className="story-body">
                  <h4>{s.names}</h4>
                  <p className="story-quote">{s.quote}</p>
                  <span className="story-date">{s.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────── */}
        <section className="cta-section">
          <div className="cta-card">
            <div className="cta-circle cta-circle-1"></div>
            <div className="cta-circle cta-circle-2"></div>
            <h2>Your Story Begins Today</h2>
            <p>Join thousands of happy families who found their perfect match through our editorial sanctuary of connections.</p>
            <Link to="/register" className="btn-cta">Get Started Now</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
