import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [eventCounts, setEventCounts] = useState({}); // { [eventId]: { going, maybe, not_going, waitlist, checked_in } }
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  const eventSocketsRef = useRef({}); // { [eventId]: WebSocket }
  const notifSocketRef = useRef(null);
  const subscribedEventsRef = useRef(new Set());

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    const newToast = { id, ...toast };
    setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Connect to user notification WebSocket
  useEffect(() => {
    if (!user) {
      if (notifSocketRef.current) {
        notifSocketRef.current.close();
        notifSocketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isSubscribed = true;
    let reconnectTimeout = null;

    function connectUserSocket() {
      if (!isSubscribed) return;

      const wsUrl = `${WS_BASE_URL}/ws/notifications/${user.id}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isSubscribed) {
          ws.close();
          return;
        }
        setIsConnected(true);
        // Start ping interval
        ws.pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'notification' || payload.type === 'new_rsvp' || payload.type === 'announcement') {
            const notif = payload.data || payload;
            setNotifications((prev) => [notif, ...prev]);
            addToast({
              title: notif.type === 'announcement' ? '📢 Announcement' : '🔔 Live RSVP Alert',
              message: notif.message || 'New update received',
              type: 'info',
            });
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onerror = () => {
        // Will trigger onclose
      };

      ws.onclose = () => {
        clearInterval(ws.pingInterval);
        setIsConnected(false);
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectUserSocket, 3000);
        }
      };

      notifSocketRef.current = ws;
    }

    connectUserSocket();

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeout);
      if (notifSocketRef.current) {
        clearInterval(notifSocketRef.current.pingInterval);
        notifSocketRef.current.close();
        notifSocketRef.current = null;
      }
    };
  }, [user, addToast]);

  // Subscribe to specific event channel
  const subscribeToEvent = useCallback((eventId) => {
    if (!eventId || subscribedEventsRef.current.has(eventId)) return;

    subscribedEventsRef.current.add(eventId);

    const wsUrl = `${WS_BASE_URL}/ws/events/${eventId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'rsvp_update' && payload.data) {
          setEventCounts((prev) => ({
            ...prev,
            [payload.event_id || eventId]: payload.data,
          }));
          addToast({
            title: '⚡ Real-Time RSVP Update',
            message: `Event stats updated! (${payload.data.going} Going)`,
            type: 'success',
          });
        }
      } catch {
        // ignore non-json
      }
    };

    ws.onclose = () => {
      clearInterval(ws.pingInterval);
      delete eventSocketsRef.current[eventId];
    };

    eventSocketsRef.current[eventId] = ws;
  }, [addToast]);

  const unsubscribeFromEvent = useCallback((eventId) => {
    subscribedEventsRef.current.delete(eventId);
    const ws = eventSocketsRef.current[eventId];
    if (ws) {
      clearInterval(ws.pingInterval);
      ws.close();
      delete eventSocketsRef.current[eventId];
    }
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        eventCounts,
        notifications,
        toasts,
        addToast,
        removeToast,
        subscribeToEvent,
        unsubscribeFromEvent,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
