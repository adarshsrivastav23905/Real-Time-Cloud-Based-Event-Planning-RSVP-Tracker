import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = [
  { label: 'Priya (Organizer)', username: 'organizer1', password: 'password123', role: 'organizer' },
  { label: 'Rahul (Organizer)', username: 'organizer2', password: 'password123', role: 'organizer' },
  { label: 'Attendee 1', username: 'attendee1', password: 'password123', role: 'attendee' },
  { label: 'Attendee 2', username: 'attendee2', password: 'password123', role: 'attendee' },
  { label: 'Platform Admin', username: 'admin', password: 'admin123', role: 'admin' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      const token = api.getToken();
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (err) {
          console.warn('Session expired or invalid token:', err.message);
          api.setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (username, password) => {
    setError(null);
    try {
      const res = await api.login(username, password);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await api.register(userData);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const quickLogin = async (demoAccount) => {
    return login(demoAccount.username, demoAccount.password);
  };

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        quickLogin,
        isOrganizer,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
