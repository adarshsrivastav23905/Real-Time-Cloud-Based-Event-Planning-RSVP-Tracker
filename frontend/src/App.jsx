import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';

import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import CreateEventPage from './pages/CreateEventPage';
import DashboardPage from './pages/DashboardPage';
import CheckInKioskPage from './pages/CheckInKioskPage';
import MyRSVPsPage from './pages/MyRSVPsPage';
import AuthPage from './pages/AuthPage';

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <Router>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Routes>
                <Route path="/" element={<Navigate to="/events" replace />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/new" element={<CreateEventPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/checkin" element={<CheckInKioskPage />} />
                <Route path="/my-rsvps" element={<MyRSVPsPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="*" element={<Navigate to="/events" replace />} />
              </Routes>
            </main>
            <Toast />
          </div>
        </Router>
      </WebSocketProvider>
    </AuthProvider>
  );
}
