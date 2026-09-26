import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Users,
  CheckCircle2,
  TrendingUp,
  QrCode,
  PlusCircle,
  Sparkles,
  ExternalLink,
  Percent,
} from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#6366f1'];

export default function DashboardPage() {
  const { user, isOrganizer } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getOrganizerDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err.message || 'Failed to load analytics dashboard');
      } finally {
        setLoading(false);
      }
    }
    if (isOrganizer) {
      fetchDashboard();
    }
  }, [isOrganizer]);

  if (!isOrganizer) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Organizer Access Required</h2>
        <p style={{ color: '#94a3b8', marginBottom: 20 }}>
          Please sign in as an organizer or admin to access this analytics dashboard.
        </p>
        <Link to="/events" className="btn btn-primary">
          View Public Events
        </Link>
      </div>
    );
  }

  if (loading && !dashboard) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8' }}>
        <div className="live-pulse" style={{ width: 14, height: 14, marginBottom: 12 }} />
        <div>Aggregating cloud analytics...</div>
      </div>
    );
  }

  const pieData = [
    { name: 'Going', value: dashboard?.total_going || 0 },
    { name: 'Maybe', value: dashboard?.total_maybe || 0 },
    { name: 'Not Going', value: dashboard?.total_not_going || 0 },
  ].filter((d) => d.value > 0);

  const barData = (dashboard?.events || []).map((e) => ({
    name: e.event_name.length > 18 ? e.event_name.slice(0, 18) + '...' : e.event_name,
    Going: e.going_count,
    Maybe: e.maybe_count,
    NotGoing: e.not_going_count,
    CheckedIn: e.checked_in_count,
    Capacity: e.max_capacity,
  }));

  return (
    <div style={{ padding: '36px 0 80px' }}>
      <div className="container">
        
        {/* Header Strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: '32px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                color: '#818cf8',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              <Sparkles size={14} /> Real-Time Analytics & Operations
            </div>
            <h1 style={{ fontSize: '2.2rem' }}>Organizer Dashboard</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              High-level overview of registration volumes, attendance rates, and capacity allocation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/checkin" className="btn btn-secondary">
              <QrCode size={16} /> Check-In Kiosk
            </Link>
            <Link to="/events/new" className="btn btn-primary">
              <PlusCircle size={16} /> New Event
            </Link>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* KPI Cards Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total Events</span>
              <Calendar size={18} color="#818cf8" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{dashboard?.total_events || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              {dashboard?.upcoming_events || 0} currently upcoming
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Confirmed RSVPs</span>
              <CheckCircle2 size={18} color="#34d399" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>
              {dashboard?.total_going || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              Total confirmed attendee seats
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Venue Check-Ins</span>
              <QrCode size={18} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>
              {dashboard?.total_checked_in || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              Verified at venue kiosk
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Overall Response Rate</span>
              <Percent size={18} color="#c084fc" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc' }}>
              {dashboard?.overall_response_rate || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              Across all published events
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
            marginBottom: '36px',
          }}
        >
          {/* Bar Chart */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={18} color="#818cf8" /> RSVP Responses per Event
            </h3>

            {barData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>No event data available</div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Going" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Maybe" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="CheckedIn" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="#10b981" /> Aggregate Response Breakdown
            </h3>

            {pieData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>No responses recorded yet</div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Event Analytics Table */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Event Performance Breakdown</h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Event</th>
                  <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Going</th>
                  <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Maybe</th>
                  <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Checked-In</th>
                  <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Waitlist</th>
                  <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Capacity Fill</th>
                  <th style={{ padding: '12px 14px', color: '#94a3b8', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.events || []).map((ev) => (
                  <tr
                    key={ev.event_id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s' }}
                  >
                    <td style={{ padding: '14px' }}>
                      <Link
                        to={`/events/${ev.event_id}`}
                        style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {ev.event_name} <ExternalLink size={13} color="#818cf8" />
                      </Link>
                    </td>
                    <td style={{ padding: '14px', color: '#34d399', fontWeight: 600 }}>{ev.going_count}</td>
                    <td style={{ padding: '14px', color: '#fbbf24' }}>{ev.maybe_count}</td>
                    <td style={{ padding: '14px', color: '#38bdf8', fontWeight: 600 }}>{ev.checked_in_count}</td>
                    <td style={{ padding: '14px', color: ev.waitlist_count > 0 ? '#fbbf24' : '#64748b' }}>
                      {ev.waitlist_count}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="capacity-bar" style={{ width: 80, height: 6 }}>
                          <div
                            className="capacity-bar-fill capacity-fill-normal"
                            style={{ width: `${Math.min(100, ev.capacity_utilization)}%` }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ev.capacity_utilization}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <Link
                        to={`/events/${ev.event_id}`}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
