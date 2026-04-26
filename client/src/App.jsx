import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './hooks/useAuth';
import axiosInstance from './api/axiosInstance';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import Toast from './components/Toast';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const JoinDocument = () => {
  const { token } = useParams();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documentId, setDocumentId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const joinDocument = async () => {
      try {
        const headers = isAuthenticated 
          ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
          : {};
        
        const response = await axiosInstance.get(`/documents/join/${token}`, { headers });
        setDocumentId(response.data.documentId);
      } catch (err) {
        console.error('Failed to join document:', err);
        setError(err.response?.data?.error || 'Invalid share link');
      } finally {
        setLoading(false);
      }
    };

    joinDocument();
  }, [token, isAuthenticated]);

  if (loading) {
    return <div className="loading-screen">Accessing shared document...</div>;
  }

  if (error) {
    return (
      <div className="loading-screen">
        <div className="error-message">{error}</div>
        <p><a href="/dashboard">Back to dashboard</a></p>
      </div>
    );
  }

  if (documentId) {
    return <Navigate to={`/documents/${documentId}`} replace />;
  }

  return <Navigate to="/login" replace />;
};

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <PrivateRoute>
            <Editor />
          </PrivateRoute>
        }
      />
      <Route path="/join/:token" element={<JoinDocument />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <Toast />
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
