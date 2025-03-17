// client/src/components/dashboard/Receipts.tsx
import React from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';

const ReceiptsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{"username":""}');
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };
  
  return (
    <DashboardLayout onLogout={handleLogout} user={user}>
      <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Receipts</h1>
        <p className="text-gray-600">Manage your receipts here.</p>
        
        {/* Receipt content will go here */}
      </div>
    </DashboardLayout>
  );
};

export default ReceiptsPage;
