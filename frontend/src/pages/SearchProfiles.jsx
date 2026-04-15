import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recommendationAPI, interestAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import './SearchProfiles.css';

export default function SearchProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ religion: '', city: '', education: '' });
  const [sentIds, setSentIds] = useState(new Set());

  useEffect(() => {
    loadProfiles();
    if (user) {
      interestAPI.getSent().then(d => {
        const ids = new Set((d.data || []).map(i => i.receiver?._id || i.receiver));
        setSentIds(ids);
      }).catch(() => {});
    }
  }, [user]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await recommendationAPI.getTop();
      setProfiles(data.data || data.recommendations || []);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterest = async (receiverId) => {
    try {
      await interestAPI.send(receiverId);
      setSentIds(prev => new Set(prev).add(receiverId));
    } catch { /* already sent */ }
  };

  const filtered = profiles.filter(p => {
    if (filters.religion && p.religion && !p.religion.toLowerCase().includes(filters.religion.toLowerCase())) return false;
    if (filters.city && p.city && !p.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.education && p.education && !p.education.toLowerCase().includes(filters.education.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <main className="search-page">
        <header className="search-header fade-in">
          <h1>Find Your Soul's Reflection</h1>
          <p>Discover intentional connections through our curated selection of individuals seeking meaningful union.</p>
        </header>

        <div className="search-layout">
          {/* ── Filter Sidebar ───────────────────── */}
          <aside className="search-aside">
            <div className="filter-card">
              <div className="filter-top">
                <h2>Refine Search</h2>
                <span className="material-symbols-outlined">tune</span>
              </div>

              <div className="filter-group">
                <label>Spiritual Path</label>
                <select value={filters.religion} onChange={e => setFilters({...filters, religion: e.target.value})}>
                  <option value="">All Faiths</option>
                  <option value="hindu">Hindu</option>
                  <option value="muslim">Muslim</option>
                  <option value="christian">Christian</option>
                  <option value="sikh">Sikh</option>
                  <option value="jain">Jain</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Location</label>
                <input type="text" placeholder="City or Region" value={filters.city}
                  onChange={e => setFilters({...filters, city: e.target.value})} />
              </div>

              <div className="filter-group">
                <label>Education</label>
                <input type="text" placeholder="e.g. Engineering" value={filters.education}
                  onChange={e => setFilters({...filters, education: e.target.value})} />
              </div>

              <button className="btn-filter" onClick={loadProfiles}>Update Discovery</button>
            </div>
          </aside>

          {/* ── Profile Grid ─────────────────────── */}
          <div className="search-results">
            {loading ? (
              <div className="search-loading"><div className="spinner"></div><p>Discovering profiles...</p></div>
            ) : filtered.length === 0 ? (
              <div className="search-empty">
                <span className="material-symbols-outlined">search_off</span>
                <h3>No profiles found</h3>
                <p>Try adjusting your filters or check back later for new members.</p>
              </div>
            ) : (
              <div className="profile-grid">
                {filtered.map(p => (
                  <div className="profile-card" key={p._id}>
                    <div className="card-img">
                      {p.profilePic || p.profilePhoto ? (
                        <img src={p.profilePic || p.profilePhoto} alt={p.name} />
                      ) : (
                        <div className="card-img-placeholder">
                          <span>{p.name?.[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      {user && !sentIds.has(p._id) && (
                        <button className="card-fav" onClick={() => handleSendInterest(p._id)} title="Send Interest">
                          <span className="material-symbols-outlined">favorite</span>
                        </button>
                      )}
                      {sentIds.has(p._id) && (
                        <div className="card-sent-badge">
                          <span className="material-symbols-outlined filled">favorite</span> Sent
                        </div>
                      )}
                    </div>
                    <div className="card-body">
                      <h3>{p.name}{p.age ? `, ${p.age}` : ''}</h3>
                      <p className="card-meta">{p.job || p.occupation || 'Professional'} • {p.city || 'India'}</p>
                      <p className="card-bio">{p.bio || 'Seeking a meaningful connection.'}</p>
                      <Link to={user ? `/profile/${p._id}` : '/login'} className="btn-view-profile">View Profile</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
