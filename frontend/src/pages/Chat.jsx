import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { chatAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import './Chat.css';

export default function Chat() {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const partnerParam = searchParams.get('partner');

  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load conversations
  useEffect(() => {
    chatAPI.getConversations()
      .then(d => {
        setConversations(d.data || d.conversations || []);
        setLoadingConvos(false);
      })
      .catch(() => setLoadingConvos(false));
  }, []);

  // Auto-select partner from URL
  useEffect(() => {
    if (partnerParam && conversations.length > 0) {
      const conv = conversations.find(c => c.user?._id === partnerParam || c.partner?._id === partnerParam);
      if (conv) setActivePartner(conv.user || conv.partner);
      else setActivePartner({ _id: partnerParam, name: 'User' });
    }
  }, [partnerParam, conversations]);

  // Socket.io connection
  useEffect(() => {
    if (!token) return;
    const socket = io('http://localhost:9080', { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (user?._id) socket.emit('join', user._id);
    });

    socket.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
      // Update last message in conversations
      setConversations(prev => prev.map(c => {
        const cId = c.user?._id || c.partner?._id;
        if (cId === msg.sender || cId === msg.receiver) {
          return { ...c, lastMessage: msg };
        }
        return c;
      }));
    });

    return () => socket.disconnect();
  }, [token, user]);

  // Load messages when partner changes
  useEffect(() => {
    if (!activePartner?._id) return;
    setLoadingMessages(true);
    chatAPI.getMessages(activePartner._id)
      .then(d => {
        setMessages(d.data || d.messages || []);
        setLoadingMessages(false);
      })
      .catch(() => setLoadingMessages(false));
    chatAPI.markAsRead(activePartner._id).catch(() => {});
  }, [activePartner]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!text.trim() || !activePartner?._id) return;
    const msgData = { receiver: activePartner._id, content: text.trim() };
    socketRef.current?.emit('sendMessage', msgData);

    // Optimistic add
    const optimistic = {
      _id: Date.now().toString(),
      sender: user._id,
      receiver: activePartner._id,
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');
  }, [text, activePartner, user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <main className="chat-page">
      {/* ── Sidebar ──────────────────────────── */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Sacred Connections</h2>
        </div>
        <div className="sidebar-search">
          <input type="text" placeholder="Search conversations..." />
          <span className="material-symbols-outlined">search</span>
        </div>
        <div className="conversation-list">
          {loadingConvos ? (
            <div className="sidebar-loading"><div className="spinner"></div></div>
          ) : conversations.length === 0 ? (
            <div className="sidebar-empty">
              <p>No conversations yet.</p>
              <Link to="/search">Find matches</Link>
            </div>
          ) : (
            conversations.map(c => {
              const p = c.user || c.partner || {};
              const isActive = activePartner?._id === p._id;
              const initial = p.name?.[0]?.toUpperCase() || '?';
              return (
                <div
                  key={p._id}
                  className={`convo-item ${isActive ? 'active' : ''}`}
                  onClick={() => { setActivePartner(p); setSidebarOpen(false); }}
                >
                  <div className="convo-avatar">
                    {p.profilePic || p.profilePhoto
                      ? <img src={p.profilePic || p.profilePhoto} alt="" />
                      : <span>{initial}</span>}
                  </div>
                  <div className="convo-info">
                    <h4>{p.name || 'Unknown'}</h4>
                    <p>{c.lastMessage?.content?.slice(0, 40) || 'Start a conversation...'}</p>
                  </div>
                  {c.unreadCount > 0 && <span className="convo-unread">{c.unreadCount}</span>}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Chat Window ──────────────────────── */}
      <section className="chat-window">
        {!activePartner ? (
          <div className="chat-empty">
            <span className="material-symbols-outlined">chat_bubble</span>
            <h3>Select a conversation</h3>
            <p>Choose from your connections to begin a sacred dialogue.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <button className="chat-back-btn" onClick={() => setSidebarOpen(true)}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div className="chat-partner">
                <div className="convo-avatar small">
                  {activePartner.profilePic || activePartner.profilePhoto
                    ? <img src={activePartner.profilePic || activePartner.profilePhoto} alt="" />
                    : <span>{activePartner.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div>
                  <Link to={`/profile/${activePartner._id}`}><h3>{activePartner.name || 'User'}</h3></Link>
                  <span className="chat-status">{activePartner.city || 'Connected'}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {loadingMessages ? (
                <div className="chat-msg-loading"><div className="spinner"></div></div>
              ) : messages.length === 0 ? (
                <div className="chat-msg-empty">
                  <p>Say hello and start your story together! ✨</p>
                </div>
              ) : (
                messages.map(m => {
                  const isMine = m.sender === user._id || m.sender?._id === user._id;
                  return (
                    <div key={m._id} className={`msg ${isMine ? 'msg-sent' : 'msg-received'}`}>
                      <div className="msg-bubble">
                        <p>{m.content}</p>
                      </div>
                      <span className="msg-time">{formatTime(m.createdAt)}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <div className="chat-input-wrap">
                <textarea
                  placeholder="Compose your message..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows="1"
                />
                <button className="btn-send" onClick={handleSend} disabled={!text.trim()}>
                  <span className="material-symbols-outlined filled">send</span>
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
