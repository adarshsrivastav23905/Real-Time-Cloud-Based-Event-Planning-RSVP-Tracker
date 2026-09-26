import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Users,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user, isOrganizer } = useAuth();

  // Form states with reasonable defaults (e.g. tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    event_type: 'workshop',
    event_date: `${defaultDateStr}T10:00:00`,
    start_time: '10:00',
    end_time: '17:00',
    venue: '',
    online_link: '',
    max_capacity: 50,
    registration_deadline: `${defaultDateStr}T09:00:00`,
    status: 'published',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOrganizer) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Organizer Access Required</h2>
        <p style={{ color: '#94a3b8', marginBottom: 20 }}>
          You need an organizer or admin account to create new events.
        </p>
        <Link to="/events" className="btn btn-primary">
          <ArrowLeft size={16} /> Back to Events
        </Link>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Basic validations
      if (formData.start_time >= formData.end_time) {
        throw new Error('Start time must be strictly before end time.');
      }

      const payload = {
        ...formData,
        max_capacity: Number(formData.max_capacity),
        event_date: new Date(formData.event_date).toISOString(),
        registration_deadline: new Date(formData.registration_deadline).toISOString(),
      };

      const created = await api.createEvent(payload);
      navigate(`/events/${created.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '36px 0 80px' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        
        <Link
          to="/events"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#94a3b8',
            fontSize: '0.875rem',
            marginBottom: '20px',
          }}
        >
          <ArrowLeft size={16} /> Back to Events
        </Link>

        <div className="glass-panel" style={{ padding: '36px' }}>
          
          <div style={{ marginBottom: '28px' }}>
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
              <Sparkles size={14} /> Organizer Portal
            </div>
            <h1 style={{ fontSize: '2rem' }}>Create New Event</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Publish your event to the cloud network with atomic capacity control and live RSVP tracker.
            </p>
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
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            
            {/* Event Name */}
            <div className="form-group">
              <label className="form-label">Event Title *</label>
              <input
                type="text"
                name="event_name"
                required
                placeholder="e.g. Next-Gen Cloud Architecture Summit"
                value={formData.event_name}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Event Type & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <select name="event_type" value={formData.event_type} onChange={handleChange} className="form-select">
                  <option value="workshop">Workshop</option>
                  <option value="conference">Conference</option>
                  <option value="meetup">Meetup</option>
                  <option value="bootcamp">Bootcamp</option>
                  <option value="seminar">Seminar</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="form-select">
                  <option value="published">Published (Accepting RSVPs)</option>
                  <option value="draft">Draft (Hidden)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description & Agenda</label>
              <textarea
                name="description"
                rows={4}
                placeholder="Describe key highlights, schedule, prerequisites, and who should attend..."
                value={formData.description}
                onChange={handleChange}
                className="form-textarea"
              />
            </div>

            {/* Date & Times */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Event Date & Time *</label>
                <input
                  type="datetime-local"
                  name="event_date"
                  required
                  value={formData.event_date.slice(0, 16)}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Start Time (UTC) *</label>
                <input
                  type="text"
                  name="start_time"
                  required
                  placeholder="09:00"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time (UTC) *</label>
                <input
                  type="text"
                  name="end_time"
                  required
                  placeholder="17:00"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            {/* Venue & Online Link */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Physical Venue (Optional)</label>
                <input
                  type="text"
                  name="venue"
                  placeholder="e.g. Grand Auditorium, Building B"
                  value={formData.venue}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Online Meeting URL (Optional)</label>
                <input
                  type="url"
                  name="online_link"
                  placeholder="https://meet.google.com/..."
                  value={formData.online_link}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            {/* Capacity & Deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              <div className="form-group">
                <label className="form-label">Max Seat Capacity *</label>
                <input
                  type="number"
                  name="max_capacity"
                  required
                  min={1}
                  max={10000}
                  value={formData.max_capacity}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">RSVP Deadline *</label>
                <input
                  type="datetime-local"
                  name="registration_deadline"
                  required
                  value={formData.registration_deadline.slice(0, 16)}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', gap: 14 }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, padding: '14px' }}>
                {loading ? 'Publishing Event...' : 'Publish Event'}
              </button>
              <Link to="/events" className="btn btn-secondary" style={{ padding: '14px 24px' }}>
                Cancel
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
