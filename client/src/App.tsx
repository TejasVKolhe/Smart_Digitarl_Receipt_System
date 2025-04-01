// client/src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './components/auth/Auth';
import Dashboard from './components/dashboard/Dashboard';
import ReceiptsPage from './components/dashboard/Receipts';
import AnalyticsPage from './components/dashboard/Analytics';
import CategoriesPage from './components/dashboard/Categories';
import SettingsPage from './components/dashboard/Settings';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Define interfaces for better type safety
interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Create a context for authentication
interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  logout: () => void;
}

export const AuthContext = React.createContext<AuthContextType>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  logout: () => {}
});

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Show a toast when redirecting due to missing token
    toast.error('Please log in to access this page');
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Axios interceptor to handle expired tokens
axios.interceptors.response.use(
  response => response,
  error => {
    // Check if the error is due to an unauthorized request (401)
    if (error.response && error.response.status === 401) {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show an error toast
      toast.error('Session expired. Please log in again.');
      
      // Redirect to the login page
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Function to handle logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set axios default headers for all requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
      
      // Verify the token is still valid (optional)
      const verifyToken = async () => {
        try {
          // You can add an API call here to verify the token if needed
          console.log('Token found in localStorage');
        } catch (error) {
          console.error('Token verification failed:', error);
          logout();
        }
      };
      
      verifyToken();
    }
    setIsLoading(false);
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, logout }}>
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#22c55e',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              // Fix the TypeScript error by ensuring setIsAuthenticated is correctly typed
              isAuthenticated ? 
                <Navigate to="/dashboard" /> : 
                <AuthPage setIsAuthenticated={setIsAuthenticated} />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/receipts" 
            element={
              <ProtectedRoute>
                <ReceiptsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/analytics" 
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/categories" 
            element={
              <ProtectedRoute>
                <CategoriesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          {/* Add a catch-all route for 404s */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;