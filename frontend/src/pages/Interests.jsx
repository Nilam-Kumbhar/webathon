import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { interestAPI } from '../api/api';
import Footer from '../components/Footer';
import './Interests.css';

export default function Interests() {
  const [tab, setTab] = useState('received');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      interestAPI.getReceived().then(d => setReceived(d.data || [])),
      interestAPI.getSent().then(d => setSent(d.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRespond = async (interestId, action) => {
    try {
      await interestAPI.respond(interestId, action);
      setReceived(prev => prev.filter(i => i._id !== interestId));
      setMsg(action === 'accept' ? 'Interest accepted! 🎉 You can now chat.' : 'Interest declined.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const renderUser = (u) => {
    if (!u) return null;
    const initial = u.name?.[0]?.toUpperCase() || '?';
    return (
      <Link to={`/profile/${u._id}`} className="int-user">
        <div className="int-avatar">
          {u.profilePic || u.profilePhoto
            ? <img src={u.profilePic || u.profilePhoto} alt="" />
            : <span>{initial}</span>}
        </div>
        <div className="int-info">
          <h4>{u.name || 'Unknown'}</h4>
          <p>{u.age ? `${u.age} yrs` : ''}{u.city ? ` • ${u.city}` : ''}{u.job ? ` • ${u.job}` : ''}</p>
        </div>
      </Link>
    );
  };

  if (loading) return <div className="loading-screen"><div className="brand">SacredMatch</div><div className="spinner"></div></div>;

  return (
    <>
      <main className="interests-page">
        <div className="int-inner">
          <header className="int-header fade-in">
            <h1>Your Interests</h1>
            <p>Manage your connections — accept, decline, or explore new matches.</p>
          </header>

          {msg && <div className="dash-toast">{msg}</div>}

          <nav className="int-tabs">
            <button className={tab === 'received' ? 'active' : ''} onClick={() => setTab('received')}>
              Received ({received.length})
            </button>
            <button className={tab === 'sent' ? 'active' : ''} onClick={() => setTab('sent')}>
              Sent ({sent.length})
            </button>
          </nav>

          <section className="int-content fade-in">
            {tab === 'received' && (
              <>
                {received.length === 0 ? (
                  <div className="int-empty">
                    <span className="material-symbols-outlined">favorite_border</span>
                    <h3>No interests received yet</h3>
                    <p>Complete your profile to attract more attention!</p>
                    <Link to="/dashboard" className="btn-primary-sm">Update Profile</Link>
                  </div>
                ) : (
                  <div className="int-list">
                    {received.map(i => (
                      <div className="int-card" key={i._id}>
                        {renderUser(i.sender)}
                        <div className="int-actions">
                          <button className="btn-accept" onClick={() => handleRespond(i._id, 'accept')}>
                            <span className="material-symbols-outlined">check</span> Accept
                          </button>
                          <button className="btn-reject" onClick={() => handleRespond(i._id, 'reject')}>
                            <span className="material-symbols-outlined">close</span> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'sent' && (
              <>
                {sent.length === 0 ? (
                  <div className="int-empty">
                    <span className="material-symbols-outlined">send</span>
                    <h3>No interests sent yet</h3>
                    <p>Browse profiles and send interests to get started.</p>
                    <Link to="/search" className="btn-primary-sm">Search Profiles</Link>
                  </div>
                ) : (
                  <div className="int-list">
                    {sent.map(i => (
                      <div className="int-card" key={i._id}>
                        {renderUser(i.receiver)}
                        <div className="int-status">
                          <span className={`status-badge status-${i.status || 'pending'}`}>
                            {i.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
