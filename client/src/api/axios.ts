import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',  // Make sure this matches your backend
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Example interceptor to attach token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Response interceptor (handle 401 globally if needed)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Optionally handle logout or refresh logic here
      console.error('Unauthorized - Redirecting to login');
      window.location.href = '/login';  // Change to your login route if different
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
