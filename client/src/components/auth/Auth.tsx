import React, { useState, FormEvent } from 'react';

// Mock axios-like instance
const axiosInstance = {
  post: async (url: string, data: any) => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (url === '/auth/login') {
      if (data.email === 'test@example.com' && data.password === 'password') {
        return { data: { token: 'mock-token', user: { id: '1', username: 'testuser', email: 'test@example.com' } } };
      } else {
        throw { response: { data: { message: 'Invalid credentials' } } };
      }
    } else if (url === '/auth/signup') {
      return { data: { token: 'mock-token', user: { id: '2', username: data.username, email: data.email } } };
    }
  }
};

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    username: ''
  });

  const validateFields = () => {
    const newErrors = { email: '', password: '', username: '' };
    let valid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
      valid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!isLogin) {
      if (!username) {
        newErrors.username = 'Username is required';
        valid = false;
      } else if (username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateFields()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await axiosInstance.post(
        isLogin ? '/auth/login' : '/auth/signup',
        isLogin ? { email, password } : { email, password, username }
      );

      if (response && response.data && response.data.user) {
        const { user } = response.data;
        setMessage(`Welcome, ${user.username}!`);
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-500 p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden border border-white/20">
        <div className="flex justify-center mt-8">
          <div className="h-20 w-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
            {/* Placeholder icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {isLogin ? 'Welcome Back' : 'Join Us Today'}
        </h2>

        <div className="flex mx-6 mt-8 bg-gray-100 rounded-xl p-1">
          <button
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all duration-300 ${isLogin ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all duration-300 ${!isLogin ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {!isLogin && <InputField label="Username" value={username} onChange={setUsername} error={errors.username} />}
          <InputField label="Email" value={email} onChange={setEmail} error={errors.email} />
          <InputField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            error={errors.password}
            showPasswordToggle
            onTogglePassword={() => setShowPassword(!showPassword)}
            showPassword={showPassword}
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90'
            } text-white shadow-lg hover:shadow-xl flex items-center justify-center space-x-2`}
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        {message && (
          <div className={`p-4 mt-4 mx-6 rounded-xl text-sm ${message.includes('Welcome') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  type?: string;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
}> = ({ label, value, onChange, error, type = 'text', showPasswordToggle, onTogglePassword, showPassword }) => (
  <div className="space-y-1">
    <label className="block text-sm font-semibold text-gray-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-3 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg`}
    />
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

export default AuthPage;
