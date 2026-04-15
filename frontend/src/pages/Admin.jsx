import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';
import Footer from '../components/Footer';
import './Admin.css';

export default function Admin() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uData, rData] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getReports(),
      ]);
      setUsers(uData.data || uData.users || []);
      setReports(rData.data || rData.reports || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleVerify = async (userId, status) => {
    try {
      await adminAPI.verifyUser(userId, status);
      setMsg(`User ${status} successfully`);
      loadData();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); setTimeout(() => setMsg(''), 3000); }
  };

  const handleBan = async (userId) => {
    if (!confirm('Are you sure you want to ban this user?')) return;
    try {
      await adminAPI.banUser(userId);
      setMsg('User banned');
      loadData();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="loading-screen"><div className="brand">SacredMatch</div><div className="spinner"></div></div>;

  return (
    <>
      <main className="admin-page">
        <div className="admin-inner">
          <header className="admin-header fade-in">
            <h1>Admin Console</h1>
            <p>Manage users, review reports, and maintain platform integrity.</p>
          </header>

          {msg && <div className="dash-toast">{msg}</div>}

          <nav className="admin-tabs">
            <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
              Users ({users.length})
            </button>
            <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>
              Reports ({reports.length})
            </button>
          </nav>

          <section className="admin-content fade-in">
            {tab === 'users' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>City</th>
                      <th>Verification</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-user-avatar">
                              {u.profilePic || u.profilePhoto
                                ? <img src={u.profilePic || u.profilePhoto} alt="" />
                                : <span>{u.name?.[0]?.toUpperCase()}</span>}
                            </div>
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.city || '—'}</td>
                        <td>
                          <span className={`status-badge status-${u.verification?.status || 'unverified'}`}>
                            {u.verification?.status || 'unverified'}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button className="btn-sm btn-verify" onClick={() => handleVerify(u._id, 'verified')} title="Verify">
                              <span className="material-symbols-outlined">verified</span>
                            </button>
                            <button className="btn-sm btn-ban" onClick={() => handleBan(u._id)} title="Ban">
                              <span className="material-symbols-outlined">block</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <p className="admin-empty">No users found.</p>}
              </div>
            )}

            {tab === 'reports' && (
              <div className="admin-reports">
                {reports.length === 0 ? (
                  <div className="int-empty">
                    <span className="material-symbols-outlined">shield</span>
                    <h3>No reports</h3>
                    <p>The platform is running smoothly!</p>
                  </div>
                ) : (
                  <div className="report-list">
                    {reports.map(r => (
                      <div className="report-card" key={r._id}>
                        <div className="report-header">
                          <span className={`status-badge status-${r.status || 'pending'}`}>{r.status || 'pending'}</span>
                          <span className="report-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p><strong>Reported User:</strong> {r.reportedUser?.name || r.reportedUser || 'Unknown'}</p>
                        <p><strong>Reason:</strong> {r.reason}</p>
                        {r.description && <p><strong>Details:</strong> {r.description}</p>}
                        <p className="report-by">Reported by: {r.reporter?.name || r.reporter || 'Unknown'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
