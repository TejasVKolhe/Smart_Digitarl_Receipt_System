import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import StatCard from './components/StatCard';
import RecentReceipts from './components/RecentReceipts';
import UploadArea from './components/UploadArea';
import SummaryChart from './components/SummaryChart';

const Dashboard: React.FC = () => {
  interface User {
    username: string;
    email: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get user data from localStorage or fetch from API
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      navigate('/');
      return;
    }
    
    if (userData) {
      try {
        const parsedUser: User = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUser({ username: 'User', email: 'User' });
      }
    } else {
      // Use placeholder if no user data
      setUser({ username: 'User' , email: 'User' });
    }
  }, [navigate]); // Add navigate to dependency array
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };
  
  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-500 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>
  );
  
  return (
    <DashboardLayout onLogout={handleLogout} user={user}>
      {/* Welcome Header - Removed logout button */}
      <header className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl rounded-lg">
        <div className="text-white font-semibold text-lg">Welcome, {user.username}</div>
        <div className="text-white text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </header>

      {/* Profile Section */}
      <div className="mt-8 bg-white/95 backdrop-blur-sm shadow-xl rounded-3xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Profile Overview
        </h2>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="text-lg font-semibold text-indigo-600">{user.username}</div>
            <div className="text-gray-500">Email: {user.email || 'Not available'}</div>
            <div className="mt-4">
            <button
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-200"
              onClick={() => navigate('/dashboard/settings')} // Navigate to settings
            >
            Edit Profile
            </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
        <StatCard 
          title="Total Receipts" 
          value="0" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} 
          change="+0%" 
          color="indigo"
        />
        <StatCard 
          title="Total Expenses" 
          value="₹0.00" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
          change="+0%" 
          color="purple"
        />
        <StatCard 
          title="Categories" 
          value="0" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} 
          change="+0%" 
          color="blue"
        />
        <StatCard 
          title="This Month" 
          value="₹0.00" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} 
          change="+0%" 
          color="indigo"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm shadow-xl rounded-3xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Recent Activity
          </h2>
          <SummaryChart />
        </div>
        
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-3xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Upload Receipt
          </h2>
          <UploadArea />
        </div>
      </div>
      
      <div className="mt-6 bg-white/95 backdrop-blur-sm shadow-xl rounded-3xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Recent Receipts
        </h2>
        <RecentReceipts />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;