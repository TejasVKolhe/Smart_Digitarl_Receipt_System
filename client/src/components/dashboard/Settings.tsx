/* eslint-disable @typescript-eslint/no-explicit-any */
// client/src/components/dashboard/Settings.tsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';

interface User {
  username: string;
  email: string;
  id: string;
}

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User>(JSON.parse(localStorage.getItem('user') || '{"username":"", "email":""}'));
    const [formData, setFormData] = useState({
        username: user.username,
        email: user.email,
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({
        username: '',
        email: '',
        password: ''
    });

    useEffect(() => {
        // Fetch fresh user data
        const fetchUser = async () => {
            try {
                const response = await axiosInstance.get('/auth/current');
                const userData = response.data.user;
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUser();
    }, []);

    const validateForm = () => {
        const newErrors = { username: '', email: '', password: '' };
        let isValid = true;

        if (!formData.username) {
            newErrors.username = 'Username is required';
            isValid = false;
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
            isValid = false;
        }

        if (formData.password && formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.password = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const payload = {
                username: formData.username,
                email: formData.email,
                ...(formData.password && { password: formData.password })
            };

            const response = await axiosInstance.put('/auth/profile', payload);
            
            // Update local storage and state
            const updatedUser = { ...user, ...response.data.user };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            setMessage('Profile updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            setMessage(error.response?.data?.message || 'Error updating profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <DashboardLayout onLogout={handleLogout} user={user}>
            <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6 max-w-2xl mx-auto">
                <h1 className="text-2xl font-semibold text-gray-900 mb-6">Profile Settings</h1>
                
                {message && (
                    <div className={`mb-4 p-4 rounded-lg ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            className={`mt-1 block w-full rounded-md ${errors.username ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
                        />
                        {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className={`mt-1 block w-full rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className={`mt-1 block w-full rounded-md ${errors.password ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
                            placeholder="Leave blank to keep current password"
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;