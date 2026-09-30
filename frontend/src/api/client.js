/**
 * API Client for the Real-Time Cloud-Based Event Planning & RSVP Tracker.
 * Manages HTTP communication with the FastAPI backend, authentication tokens,
 * and error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('rsvp_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('rsvp_token', token);
    } else {
      localStorage.removeItem('rsvp_token');
    }
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('rsvp_token');
    }
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.detail || data.message || 'API request failed');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error(`Unable to connect to the backend at ${API_BASE_URL}. Is FastAPI running?`);
      }
      throw err;
    }
  }

  // ─── Authentication Endpoints ────────────────────────────────────

  async register(userData) {
    const res = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async login(username, password) {
    const res = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request('/me');
  }

  // ─── Event Endpoints ─────────────────────────────────────────────

  async getEvents(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.event_type) params.append('event_type', filters.event_type);
    if (filters.search) params.append('search', filters.search);

    const qs = params.toString();
    return this.request(`/events${qs ? `?${qs}` : ''}`);
  }

  async getUpcomingEvents() {
    return this.request('/events/upcoming');
  }

  async getMyEvents() {
    return this.request('/events/my-events');
  }

  async getEvent(eventId) {
    return this.request(`/events/${eventId}`);
  }

  async createEvent(eventData) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(eventId, eventData) {
    return this.request(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(eventId) {
    return this.request(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // ─── RSVP Endpoints ──────────────────────────────────────────────

  async submitRSVP(eventId, status, guestsCount = 0) {
    return this.request(`/events/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status, guests_count: guestsCount }),
    });
  }

  async updateRSVP(eventId, status, guestsCount = 0) {
    return this.request(`/events/${eventId}/rsvp`, {
      method: 'PUT',
      body: JSON.stringify({ status, guests_count: guestsCount }),
    });
  }

  async cancelRSVP(eventId) {
    return this.request(`/events/${eventId}/rsvp`, {
      method: 'DELETE',
    });
  }

  async getEventRSVPs(eventId) {
    return this.request(`/events/${eventId}/rsvps`);
  }

  async getMyRSVPs() {
    return this.request('/rsvps/me');
  }

  async checkInAttendee(eventId, rsvpOrUserId) {
    return this.request(`/events/${eventId}/checkin/${rsvpOrUserId}`, {
      method: 'POST',
    });
  }

  // ─── Announcements & Notifications ───────────────────────────────

  async getAnnouncements(eventId) {
    return this.request(`/events/${eventId}/announcements`);
  }

  async createAnnouncement(eventId, title, message) {
    return this.request(`/events/${eventId}/announcements`, {
      method: 'POST',
      body: JSON.stringify({ title, message }),
    });
  }

  async getNotifications(unreadOnly = false) {
    return this.request(`/notifications${unreadOnly ? '?unread_only=true' : ''}`);
  }

  async markNotificationRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // ─── Analytics ───────────────────────────────────────────────────

  async getEventAnalytics(eventId) {
    return this.request(`/events/${eventId}/analytics`);
  }

  async getOrganizerDashboard() {
    return this.request('/dashboard');
  }
}

export const api = new ApiClient();
export default api;
