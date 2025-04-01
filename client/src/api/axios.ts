// Check your axiosInstance setup in d:\WebD\Smart_Digitarl_Receipt_System\client\src\api\axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000', // Make sure this matches your backend URL
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add this function to refresh tokens
const refreshAccessToken = async () => {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');
        
        const response = await axios.post('http://localhost:5000/api/auth/refresh', {
            refreshToken
        });
        
        const { token } = response.data;
        localStorage.setItem('token', token);
        return token;
    } catch (error) {
        console.error('Failed to refresh token:', error);
        // Clear all auth tokens on refresh failure
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return null;
    }
};

// Add a request interceptor with better token handling
axiosInstance.interceptors.request.use(
    config => {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // Debug token
        if (config.url?.includes('auth')) {
            console.log('Auth request detected, token:', token ? 'Present' : 'Missing');
        }
        
        // Add token to auth header if it exists
        if (token) {
            // Try both formats - some APIs expect different formats
            config.headers.Authorization = `Bearer ${token}`;
            // Some APIs expect just the token
            // config.headers.Authorization = token;
        }
        
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Update the response interceptor
axiosInstance.interceptors.response.use(
    response => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            // Try to refresh the token
            const newToken = await refreshAccessToken();
            if (newToken) {
                // Retry the original request with the new token
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);
            }
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;