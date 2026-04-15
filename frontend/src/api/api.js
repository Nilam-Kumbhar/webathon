const BASE_URL = 'http://localhost:9080/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body = null, isFormData = false) {
  const headers = { ...authHeaders() };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const config = { method, headers };
  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

// ─── Auth ────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (userData) => request('POST', '/auth/register', userData),
};

// ─── Users ───────────────────────────────────────────────
export const userAPI = {
  getMe: () => request('GET', '/users/me'),
  update: (fields) => request('PUT', '/users/update', fields),
  getPreferences: () => request('GET', '/users/preferences'),
  updatePreferences: (prefs) => request('PUT', '/users/preferences', prefs),
  uploadProfilePic: (formData) => request('POST', '/users/upload-profile-pic', formData, true),
};

// ─── Match ───────────────────────────────────────────────
export const matchAPI = {
  calculate: (userId) => request('POST', `/match/calculate/${userId}`),
  getRecommendations: () => request('GET', '/match/recommendations'),
};

// ─── Recommendations ─────────────────────────────────────
export const recommendationAPI = {
  getTop: () => request('GET', '/recommendations/top'),
  getDaily: () => request('GET', '/recommendations/daily'),
};

// ─── Verification ────────────────────────────────────────
export const verificationAPI = {
  upload: (formData) => request('POST', '/verification/upload', formData, true),
  getStatus: () => request('GET', '/verification/status'),
};

// ─── Safety ──────────────────────────────────────────────
export const safetyAPI = {
  report: (reportedUser, reason, description) =>
    request('POST', '/report', { reportedUser, reason, description }),
  block: (blockedUserId) => request('POST', '/block', { blockedUserId }),
  getBlocked: () => request('GET', '/block/list'),
};

// ─── Horoscope ───────────────────────────────────────────
export const horoscopeAPI = {
  match: (targetUserId) => request('POST', '/horoscope/match', { targetUserId }),
};

// ─── Media ───────────────────────────────────────────────
export const mediaAPI = {
  uploadVideo: (formData) => request('POST', '/media/upload-video', formData, true),
  getUserMedia: (userId) => request('GET', `/media/${userId}`),
};

// ─── Admin ───────────────────────────────────────────────
export const adminAPI = {
  getUsers: (page = 1) => request('GET', `/admin/users?page=${page}`),
  getReports: (page = 1, status = '') =>
    request('GET', `/admin/reports?page=${page}${status ? `&status=${status}` : ''}`),
  verifyUser: (userId, status) => request('PUT', `/admin/verify/${userId}`, { status }),
  banUser: (userId) => request('DELETE', `/admin/ban/${userId}`),
};

// ─── Interest ────────────────────────────────────────────
export const interestAPI = {
  send: (receiverId) => request('POST', '/interest/send', { receiverId }),
  respond: (interestId, action) => request('PUT', '/interest/respond', { interestId, action }),
  getReceived: () => request('GET', '/interest/received'),
  getSent: () => request('GET', '/interest/sent'),
  getMatches: () => request('GET', '/interest/matches'),
};

// ─── Chat ────────────────────────────────────────────────
export const chatAPI = {
  getConversations: () => request('GET', '/chat/conversations'),
  getMessages: (partnerId, page = 1) => request('GET', `/chat/messages/${partnerId}?page=${page}`),
  markAsRead: (partnerId) => request('PUT', `/chat/read/${partnerId}`),
  getUnread: () => request('GET', '/chat/unread'),
};

// ─── Health ──────────────────────────────────────────────
export const healthAPI = {
  check: () => request('GET', '/health'),
};
