import React, { useState, useEffect } from 'react';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} from './services/api';

function App() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [limit, setLimit] = useState(10);
  const [type, setType] = useState(''); // All, Placement, Result, Event
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load notifications from local backend
  const loadData = async (currentLimit = limit, currentType = type) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(currentLimit, currentType);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to connect to notification backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [limit, type]);

  // Handle marking a single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      // Update local state without full reload for instant visual micro-animations
      setNotifications(prev => prev.map(item => 
        item._id === id ? { ...item, isRead: true } : item
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  // Handle bulk read status update
  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to bulk mark read:', err);
    }
  };

  // Helper to format timestamp recency
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="app-container">
      {/* Dynamic Header Component with Student Profile Credentials */}
      <header className="app-header">
        <div className="brand-section">
          <span className="logo-icon">🔔</span>
          <div>
            <h1>Campus Pulse</h1>
            <p>Priority Announcement & Alert Inbox</p>
          </div>
        </div>
        
        <div className="student-badge">
          <span style={{ fontSize: '1.2rem' }}>🎓</span>
          <div className="student-info">
            <h4>Billa Komal Sushank</h4>
            <p>Roll No: 2311cs010089</p>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="dashboard-grid">
        {/* Left Column: Sorted Notification List Feed */}
        <section className="feed-section">
          <div className="notifications-header">
            <div className="notifications-title">
              <h2>Priority Inbox</h2>
              {unreadCount > 0 && (
                <span className="badge-unread">{unreadCount} Unread</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="btn-read-all" onClick={handleMarkAllRead}>
                Mark All Read
              </button>
            )}
          </div>

          {loading ? (
            <div className="empty-state">
              <p>🔄 Querying active priority notifications...</p>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ borderColor: 'red' }}>
              <p>⚠️ {error}</p>
              <button 
                className="btn-read-toggle" 
                style={{ marginTop: '1rem' }} 
                onClick={() => loadData()}
              >
                Retry Connection
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <p>📭 No active announcements match your filters.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((item, idx) => (
                <article 
                  key={item._id} 
                  className={`notify-card ${item.type.toLowerCase()} ${item.isRead ? 'read' : ''} slide-in`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="card-header-row">
                    <span className="category-tag">{item.type}</span>
                    {!item.isRead && (
                      <button 
                        className="btn-read-toggle" 
                        onClick={() => handleMarkAsRead(item._id)}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                  
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-message">{item.message}</p>
                  
                  <div className="card-footer-row">
                    <div className="card-time">
                      <span>🕒</span>
                      <span>{formatTime(item.createdAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Filters and Control Center Panel */}
        <aside className="control-sidebar">
          <div className="controls-card">
            <h3>Control Center</h3>
            
            {/* Filter Tabs by Category */}
            <div className="control-group">
              <label>Filter Category</label>
              <div className="tab-container">
                <button 
                  className={`tab-btn ${type === '' ? 'active' : ''}`}
                  onClick={() => setType('')}
                >
                  All
                </button>
                <button 
                  className={`tab-btn ${type === 'Placement' ? 'active' : ''}`}
                  onClick={() => setType('Placement')}
                >
                  Plac.
                </button>
                <button 
                  className={`tab-btn ${type === 'Result' ? 'active' : ''}`}
                  onClick={() => setType('Result')}
                >
                  Res.
                </button>
                <button 
                  className={`tab-btn ${type === 'Event' ? 'active' : ''}`}
                  onClick={() => setType('Event')}
                >
                  Evt.
                </button>
              </div>
            </div>

            {/* Display Limit Selector (n most important items) */}
            <div className="control-group">
              <label>Display Limit (n)</label>
              <select 
                className="custom-select" 
                value={limit} 
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              >
                <option value={5}>Top 5 Alerts</option>
                <option value={10}>Top 10 Alerts</option>
                <option value={15}>Top 15 Alerts</option>
                <option value={20}>Top 20 Alerts</option>
              </select>
            </div>

            {/* Platform Information details */}
            <div className="control-group" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority Rule System</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '0.4rem' }}>
                1. 💼 <strong>Placement</strong> (Weight 3)<br />
                2. 📈 <strong>Result</strong> (Weight 2)<br />
                3. 🎉 <strong>Event</strong> (Weight 1)<br />
                Sorted chronologically within weight groups.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
