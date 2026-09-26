import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../api/client';
import {
  Calendar,
  BarChart3,
  QrCode,
  Ticket,
  PlusCircle,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Cloud,
  CheckCheck,
  Radio,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, quickLogin, isOrganizer, isAdmin } = useAuth();
  const { isConnected, notifications: liveNotifications } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef(null);
  const demoRef = useRef(null);
  const userRef = useRef(null);

  // Fetch initial notifications
  useEffect(() => {
    if (user) {
      api.getNotifications(true).then(setNotifications).catch(() => {});
    }
  }, [user]);

  // Merge live notifications
  useEffect(() => {
    if (liveNotifications.length > 0) {
      setNotifications((prev) => {
        const latest = liveNotifications[0];
        if (prev.some((n) => n.id === latest.id)) return prev;
        return [latest, ...prev];
      });
    }
  }, [liveNotifications]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
      if (demoRef.current && !demoRef.current.contains(event.target)) {
        setShowDemoMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications([]);
    } catch {
      // ignore
    }
  };

  const handleQuickSwitch = async (acc) => {
    setShowDemoMenu(false);
    await quickLogin(acc);
    navigate('/events');
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const isActive = (path) => location.pathname === path;

  return (
    <header
      style={{
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        
        {/* Brand / Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)',
            }}
          >
            <Cloud size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                Cloud<span className="gradient-text">RSVP</span>
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isConnected ? '#34d399' : '#f87171',
                  border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  fontWeight: 600,
                }}
              >
                <span className={isConnected ? 'live-pulse' : 'live-pulse-red'} style={{ width: 6, height: 6 }} />
                {isConnected ? 'LIVE SYNC' : 'OFFLINE'}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Real-Time Cloud Event Hub</div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link
            to="/events"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive('/events') ? '#ffffff' : '#94a3b8',
              background: isActive('/events') ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
              border: `1px solid ${isActive('/events') ? 'rgba(99, 102, 241, 0.35)' : 'transparent'}`,
              transition: 'all 0.15s ease',
            }}
          >
            <Calendar size={16} /> Events
          </Link>

          {isOrganizer && (
            <Link
              to="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: isActive('/dashboard') ? '#ffffff' : '#94a3b8',
                background: isActive('/dashboard') ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                border: `1px solid ${isActive('/dashboard') ? 'rgba(99, 102, 241, 0.35)' : 'transparent'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <BarChart3 size={16} /> Dashboard
            </Link>
          )}

          {isOrganizer && (
            <Link
              to="/checkin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: isActive('/checkin') ? '#ffffff' : '#94a3b8',
                background: isActive('/checkin') ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                border: `1px solid ${isActive('/checkin') ? 'rgba(99, 102, 241, 0.35)' : 'transparent'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <QrCode size={16} /> QR Kiosk
            </Link>
          )}

          {user && (
            <Link
              to="/my-rsvps"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: isActive('/my-rsvps') ? '#ffffff' : '#94a3b8',
                background: isActive('/my-rsvps') ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                border: `1px solid ${isActive('/my-rsvps') ? 'rgba(99, 102, 241, 0.35)' : 'transparent'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <Ticket size={16} /> My RSVPs
            </Link>
          )}
        </nav>

        {/* Right Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          
          {isOrganizer && (
            <Link to="/events/new" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              <PlusCircle size={16} /> Create Event
            </Link>
          )}

          {/* Quick Demo Switcher */}
          <div ref={demoRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="btn btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.82rem', gap: 5 }}
              title="Quick Switch Demo Roles"
            >
              <User size={14} /> Demo Roles <ChevronDown size={14} />
            </button>

            {showDemoMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: '240px',
                  background: '#111827',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  padding: '8px',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  SWITCH DEMO USER:
                </div>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    onClick={() => handleQuickSwitch(acc)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: user?.username === acc.username ? '#818cf8' : '#e2e8f0',
                      background: user?.username === acc.username ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      textAlign: 'left',
                    }}
                  >
                    <span>{acc.label}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: acc.role === 'organizer' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                        color: acc.role === 'organizer' ? '#c084fc' : '#67e8f9',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          {user && (
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{
                  position: 'relative',
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: unreadCount > 0 ? '#818cf8' : '#94a3b8',
                }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: '320px',
                    maxHeight: '400px',
                    background: '#111827',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    padding: '12px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{ fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <CheckCheck size={14} /> Mark read
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: '0.85rem' }}>
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                            border: `1px solid ${notif.is_read ? 'rgba(255, 255, 255, 0.04)' : 'rgba(99, 102, 241, 0.2)'}`,
                            fontSize: '0.82rem',
                          }}
                        >
                          <div style={{ color: '#e2e8f0' }}>{notif.message}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile / Login */}
          {user ? (
            <div ref={userRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    color: '#fff',
                  }}
                >
                  {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.2 }}>{user.full_name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>{user.role}</div>
                </div>
                <ChevronDown size={14} color="#94a3b8" />
              </button>

              {showUserMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    width: '180px',
                    background: '#111827',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    padding: '8px',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#64748b' }}>
                    Signed in as <b style={{ color: '#e2e8f0' }}>{user.username}</b>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                      navigate('/auth');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#f87171',
                      background: 'rgba(239, 68, 68, 0.1)',
                      marginTop: 6,
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
              Sign In
            </Link>
          )}

        </div>
      </div>
    </header>
  );
}
