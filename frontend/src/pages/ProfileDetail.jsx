import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { matchAPI, interestAPI, horoscopeAPI, safetyAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import './ProfileDetail.css';

export default function ProfileDetail() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [matchScore, setMatchScore] = useState(null);
  const [horoscope, setHoroscope] = useState(null);
  const [sentInterest, setSentInterest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await matchAPI.calculate(userId);
        setProfile(data.targetUser || data.matchedUser || data.user || null);
        setMatchScore(data.score ?? data.matchResult?.score ?? null);
      } catch {
        try {
          // fallback: fetch from recommendations
          const rec = await matchAPI.getRecommendations();
          const found = (rec.data || rec.recommendations || []).find(u => u._id === userId);
          if (found) setProfile(found);
        } catch { /* ignore */ }
      }
      try {
        const sent = await interestAPI.getSent();
        const already = (sent.data || []).some(i => (i.receiver?._id || i.receiver) === userId);
        setSentInterest(already);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleSendInterest = async () => {
    try {
      await interestAPI.send(userId);
      setSentInterest(true);
      setMsg('Interest sent! ❤️');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); setTimeout(() => setMsg(''), 3000); }
  };

  const handleHoroscope = async () => {
    try {
      const data = await horoscopeAPI.match(userId);
      setHoroscope(data);
    } catch (err) { setMsg(err.message); setTimeout(() => setMsg(''), 3000); }
  };

  const handleReport = async () => {
    const reason = prompt('Reason: fake_profile, harassment, inappropriate_content, spam, other');
    if (!reason) return;
    try {
      await safetyAPI.report(userId, reason, '');
      setMsg('Report submitted.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); setTimeout(() => setMsg(''), 3000); }
  };

  const handleBlock = async () => {
    if (!confirm('Are you sure you want to block this user?')) return;
    try {
      await safetyAPI.block(userId);
      setMsg('User blocked.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="loading-screen"><div className="brand">SacredMatch</div><div className="spinner"></div></div>;
  if (!profile) return (
    <main className="profile-detail-page"><div className="profile-empty"><h2>Profile not found</h2><p>This profile may not exist or may be unavailable.</p></div></main>
  );

  const initials = profile.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <main className="profile-detail-page">
        {msg && <div className="toast info">{msg}</div>}

        {/* ── Hero ───────────────────────────────── */}
        <section className="pd-hero">
          <div className="pd-hero-img">
            {profile.profilePic || profile.profilePhoto ? (
              <img src={profile.profilePic || profile.profilePhoto} alt={profile.name} />
            ) : (
              <div className="pd-hero-placeholder"><span>{initials}</span></div>
            )}
            <div className="pd-hero-overlay">
              <div className="pd-hero-info">
                <div>
                  <h1>{profile.name}</h1>
                  <div className="pd-tags">
                    {profile.age && <span className="pd-tag">{profile.age} Years</span>}
                    {profile.city && <span className="pd-tag">{profile.city}{profile.country ? `, ${profile.country}` : ''}</span>}
                    {(profile.job || profile.occupation) && <span className="pd-tag">{profile.job || profile.occupation}</span>}
                  </div>
                </div>
                <div className="pd-hero-actions">
                  {user && user._id !== userId && (
                    <button className="btn-interest" onClick={handleSendInterest} disabled={sentInterest}>
                      <span className="material-symbols-outlined">{sentInterest ? 'check' : 'favorite'}</span>
                      {sentInterest ? 'Interest Sent' : 'Send Interest'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {matchScore !== null && (
            <div className="pd-match-badge">
              <span className="material-symbols-outlined filled">stars</span>
              {Math.round(matchScore)}% Match
            </div>
          )}
        </section>

        {/* ── Content Grid ───────────────────────── */}
        <div className="pd-grid">
          <div className="pd-main">
            {/* Bio */}
            {profile.bio && (
              <section className="pd-section">
                <h2>A Warm, Thoughtful Narrative</h2>
                <div className="pd-bio-card">
                  <p>{profile.bio}</p>
                </div>
              </section>
            )}

            {/* Details */}
            <section className="pd-section">
              <h2>Personal Essence</h2>
              <div className="pd-details-grid">
                {profile.religion && <div className="pd-detail"><span className="pd-detail-label">Religion</span><span className="pd-detail-value">{profile.religion}</span></div>}
                {profile.caste && <div className="pd-detail"><span className="pd-detail-label">Caste</span><span className="pd-detail-value">{profile.caste}</span></div>}
                {profile.education && <div className="pd-detail"><span className="pd-detail-label">Education</span><span className="pd-detail-value">{profile.education}</span></div>}
                {profile.salary && <div className="pd-detail"><span className="pd-detail-label">Income</span><span className="pd-detail-value">₹{profile.salary.toLocaleString()}/yr</span></div>}
                {profile.gender && <div className="pd-detail"><span className="pd-detail-label">Gender</span><span className="pd-detail-value">{profile.gender}</span></div>}
                {profile.state && <div className="pd-detail"><span className="pd-detail-label">State</span><span className="pd-detail-value">{profile.state}</span></div>}
              </div>
            </section>

            {/* Interests */}
            {profile.interests?.length > 0 && (
              <section className="pd-section">
                <h2>Interests & Passions</h2>
                <div className="pd-chips">
                  {profile.interests.map(i => <span key={i} className="pd-chip">{i}</span>)}
                </div>
              </section>
            )}

            {/* Horoscope */}
            {user && (
              <section className="pd-section">
                <h2>Horoscope Compatibility</h2>
                {!horoscope ? (
                  <button className="btn-horoscope" onClick={handleHoroscope}>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Check Zodiac Compatibility
                  </button>
                ) : (
                  <div className="pd-horoscope-result">
                    <p><strong>Score:</strong> {horoscope.score || horoscope.compatibility?.score || 'N/A'}</p>
                    <p>{horoscope.explanation || horoscope.compatibility?.explanation || ''}</p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="pd-sidebar">
            <div className="pd-sidebar-card">
              <h3>Interested in {profile.name?.split(' ')[0]}?</h3>
              <p>Be the first to start a conversation and see if your values align.</p>
              {user && user._id !== userId && (
                <div className="pd-sidebar-actions">
                  <button className="btn-submit" onClick={handleSendInterest} disabled={sentInterest}>
                    {sentInterest ? 'Interest Sent' : 'Send Interest'}
                  </button>
                </div>
              )}
            </div>

            {/* Verification badge */}
            {profile.verification?.status === 'verified' && (
              <div className="pd-verified">
                <div className="pd-verified-icon">
                  <span className="material-symbols-outlined filled">verified_user</span>
                </div>
                <div>
                  <p className="pd-verified-title">Verified Profile</p>
                  <p className="pd-verified-desc">Identity verified via documents</p>
                </div>
              </div>
            )}

            {/* Safety actions */}
            {user && user._id !== userId && (
              <div className="pd-safety">
                <button className="btn-safety" onClick={handleReport}>
                  <span className="material-symbols-outlined">flag</span> Report
                </button>
                <button className="btn-safety" onClick={handleBlock}>
                  <span className="material-symbols-outlined">block</span> Block
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
