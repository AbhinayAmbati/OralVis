import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PatientDashboard from './components/patient/PatientDashboard';
import PatientUpload from './components/patient/PatientUpload';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminAnnotation from './components/admin/AdminAnnotation';
import Navbar from './components/layout/Navbar';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Main App Routes
const AppRoutes = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />)} />
        <Route path="/register" element={!user ? <Register /> : (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />)} />
        
        {/* Patient Routes */}
        <Route path="/" element={
          <ProtectedRoute requiredRole="patient">
            <PatientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute requiredRole="patient">
            <PatientUpload />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/annotate/:id" element={
          <ProtectedRoute requiredRole="admin">
            <AdminAnnotation />
          </ProtectedRoute>
        } />
        
        {/* Redirect based on role */}
        <Route path="*" element={
          user ? (
            user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
