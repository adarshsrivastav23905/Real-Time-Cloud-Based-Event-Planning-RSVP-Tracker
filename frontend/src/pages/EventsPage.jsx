import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EventCard from '../components/EventCard';
import api from '../api/client';
import {
  Search,
  Filter,
  PlusCircle,
  Calendar,
  Sparkles,
  Layers,
  Users,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export default function EventsPage() {
  const { user, isOrganizer } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedStatus !== 'all') filters.status = selectedStatus;
      if (selectedType !== 'all') filters.event_type = selectedType;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const data = await api.getEvents(filters);
      setEvents(data);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedType, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  // Calculate quick stats across events
  const totalEvents = events.length;
  const totalGoing = events.reduce((acc, e) => acc + (e.going_count || 0), 0);
  const totalCapacity = events.reduce((acc, e) => acc + (e.max_capacity || 0), 0);

  const eventTypes = ['all', 'workshop', 'conference', 'meetup', 'bootcamp', 'seminar', 'general'];

  return (
    <div style={{ padding: '36px 0 60px' }}>
      <div className="container">
        
        {/* Hero Header */}
        <div style={{ marginBottom: '36px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#a5b4fc',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '14px',
            }}
          >
            <Sparkles size={16} /> Cloud-Synced Event Network
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
            Discover & Track <span className="gradient-text">Real-Time Events</span>
          </h1>
          <p style={{ color: '#94a3b8', maxWidth: '650px', margin: '0 auto', fontSize: '1.05rem' }}>
            Seamless RSVP registration, live seat synchronization, waitlist queue management, and instantaneous venue check-in.
          </p>
        </div>

        {/* Quick Highlights / Stats Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '36px',
          }}
        >
          <div className="glass-panel" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active Events</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{totalEvents}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Confirmed RSVPs</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{totalGoing} Attendees</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Capacity</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{totalCapacity} Seats</div>
            </div>
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div
          className="glass-panel"
          style={{
            padding: '16px 20px',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: '1 1 280px',
              maxWidth: '420px',
              position: 'relative',
            }}
          >
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              placeholder="Search events by title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px', height: '42px', fontSize: '0.9rem' }}
            />
          </form>

          {/* Type Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {eventTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  background: selectedType === type ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedType === type ? '#ffffff' : '#94a3b8',
                  border: `1px solid ${selectedType === type ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Create Button */}
          {isOrganizer && (
            <Link to="/events/new" className="btn btn-primary" style={{ padding: '8px 16px', height: '42px' }}>
              <PlusCircle size={16} /> New Event
            </Link>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div className="live-pulse" style={{ width: 14, height: 14, marginBottom: 12 }} />
            <div>Synchronizing event catalog...</div>
          </div>
        ) : events.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#94a3b8',
            }}
          >
            <Calendar size={48} color="#6366f1" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: 8 }}>No events found</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
              Try adjusting your search query or filter tags to see available events.
            </p>
            {isOrganizer && (
              <Link to="/events/new" className="btn btn-primary">
                <PlusCircle size={16} /> Create First Event
              </Link>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '24px',
            }}
          >
            {events.map((event) => (
              <EventCard key={event.id} event={event} onRSVPChanged={fetchEvents} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
