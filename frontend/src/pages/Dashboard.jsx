import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, interestAPI, recommendationAPI } from '../api/api';
import Footer from '../components/Footer';
import './Dashboard.css';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [matches, setMatches] = useState([]);
  const [daily, setDaily] = useState([]);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setProfileForm({
      name: user.name || '', bio: user.bio || '', city: user.city || '',
      education: user.education || '', job: user.job || '',
      religion: user.religion || '', caste: user.caste || '',
      salary: user.salary || '',
    });
  }, [user]);

  useEffect(() => {
    interestAPI.getReceived().then(d => setReceived(d.data || [])).catch(() => {});
    interestAPI.getSent().then(d => setSent(d.data || [])).catch(() => {});
    interestAPI.getMatches().then(d => setMatches(d.data || [])).catch(() => {});
    recommendationAPI.getDaily().then(d => setDaily(d.data || d.recommendations || [])).catch(() => {});
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userAPI.update(profileForm);
      await refreshUser();
      setMsg('Profile updated!');
      setEditing(false);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  const handleRespond = async (interestId, action) => {
    try {
      await interestAPI.respond(interestId, action);
      setReceived(prev => prev.filter(i => i._id !== interestId));
      if (action === 'accept') {
        interestAPI.getMatches().then(d => setMatches(d.data || [])).catch(() => {});
      }
    } catch (err) { setMsg(err.message); }
  };

  const handlePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('profilePic', file);
    try {
      await userAPI.uploadProfilePic(fd);
      await refreshUser();
      setMsg('Photo updated!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); }
  };

  if (!user) return null;
  const initials = user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <main className="dashboard-page">
        <div className="dash-inner">
          {msg && <div className="dash-toast">{msg}</div>}

          {/* ── Profile Header ─────────────────────── */}
          <section className="dash-header fade-in">
            <div className="dash-avatar-wrap">
              <div className="dash-avatar">
                {user.profilePic || user.profilePhoto
                  ? <img src={user.profilePic || user.profilePhoto} alt={user.name} />
                  : <span>{initials}</span>}
              </div>
              <label className="dash-avatar-upload" title="Change photo">
                <span className="material-symbols-outlined">add_a_photo</span>
                <input type="file" accept="image/*" onChange={handlePicUpload} hidden />
              </label>
            </div>
            <div className="dash-info">
              <h1>{user.name}</h1>
              <p className="dash-meta">{user.city || 'No location'} • {user.age ? `${user.age} years` : 'Age not set'}</p>
              <p className="dash-bio">{user.bio || 'No bio yet.'}</p>
              <div className="dash-badges">
                <span className="badge">{user.verification?.status || 'unverified'}</span>
                {user.role === 'admin' && <span className="badge badge-admin">Admin</span>}
              </div>
            </div>
          </section>

          {/* ── Tabs ───────────────────────────────── */}
          <nav className="dash-tabs">
            {['overview', 'edit', 'interests', 'matches'].map(t => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => { setTab(t); setEditing(t === 'edit'); }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>

          {/* ── Tab Content ────────────────────────── */}
          <section className="dash-content fade-in">
            {tab === 'overview' && (
              <div className="dash-overview">
                <div className="stat-grid">
                  <div className="stat-card">
                    <span className="material-symbols-outlined">favorite</span>
                    <h3>{received.length}</h3>
                    <p>Received</p>
                  </div>
                  <div className="stat-card">
                    <span className="material-symbols-outlined">send</span>
                    <h3>{sent.length}</h3>
                    <p>Sent</p>
                  </div>
                  <div className="stat-card">
                    <span className="material-symbols-outlined">handshake</span>
                    <h3>{matches.length}</h3>
                    <p>Matches</p>
                  </div>
                </div>
                {daily.length > 0 && (
                  <div className="daily-section">
                    <h2>Daily Suggestions</h2>
                    <div className="daily-grid">
                      {daily.slice(0, 4).map(u => (
                        <Link to={`/profile/${u._id}`} key={u._id} className="daily-card">
                          <div className="daily-avatar">
                            {u.profilePic || u.profilePhoto
                              ? <img src={u.profilePic || u.profilePhoto} alt={u.name} />
                              : <span>{u.name?.[0]}</span>}
                          </div>
                          <h4>{u.name}</h4>
                          <p>{u.age ? `${u.age} yrs` : ''}{u.city ? ` • ${u.city}` : ''}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'edit' && (
              <form className="edit-form" onSubmit={handleProfileUpdate}>
                <div className="edit-grid">
                  {Object.entries(profileForm).map(([key, val]) => (
                    <div className="form-field" key={key}>
                      <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                      {key === 'bio' ? (
                        <textarea rows="3" value={val} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} />
                      ) : (
                        <input type={key === 'salary' ? 'number' : 'text'} value={val} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} />
                      )}
                    </div>
                  ))}
                </div>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {tab === 'interests' && (
              <div className="interests-tab">
                <h2>Received Interests ({received.length})</h2>
                {received.length === 0 && <p className="empty-msg">No pending interests yet.</p>}
                <div className="interest-list">
                  {received.map(i => (
                    <div className="interest-item" key={i._id}>
                      <Link to={`/profile/${i.sender._id}`} className="interest-user">
                        <div className="interest-avatar">
                          {i.sender.profilePic || i.sender.profilePhoto
                            ? <img src={i.sender.profilePic || i.sender.profilePhoto} alt="" />
                            : <span>{i.sender.name?.[0]}</span>}
                        </div>
                        <div>
                          <h4>{i.sender.name}</h4>
                          <p>{i.sender.age ? `${i.sender.age} yrs` : ''}{i.sender.city ? ` • ${i.sender.city}` : ''}</p>
                        </div>
                      </Link>
                      <div className="interest-actions">
                        <button className="btn-accept" onClick={() => handleRespond(i._id, 'accept')}>Accept</button>
                        <button className="btn-reject" onClick={() => handleRespond(i._id, 'reject')}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'matches' && (
              <div className="matches-tab">
                <h2>Mutual Matches ({matches.length})</h2>
                {matches.length === 0 && <p className="empty-msg">No mutual matches yet. Send and accept interests to start.</p>}
                <div className="match-list">
                  {matches.map(m => (
                    <div className="match-item" key={m.interestId}>
                      <Link to={`/profile/${m.user._id}`} className="interest-user">
                        <div className="interest-avatar">
                          {m.user.profilePic || m.user.profilePhoto
                            ? <img src={m.user.profilePic || m.user.profilePhoto} alt="" />
                            : <span>{m.user.name?.[0]}</span>}
                        </div>
                        <div>
                          <h4>{m.user.name}</h4>
                          <p>{m.user.age ? `${m.user.age} yrs` : ''}{m.user.city ? ` • ${m.user.city}` : ''}</p>
                        </div>
                      </Link>
                      <Link to={`/chat?partner=${m.user._id}`} className="btn-chat-link">
                        <span className="material-symbols-outlined">chat</span> Chat
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
