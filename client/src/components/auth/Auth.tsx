import React, { useState, FormEvent } from 'react';

// Mock axios instance for demonstration
const axiosInstance = {
  post: async (url, data) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (url === '/auth/login') {
      if (data.email === 'test@example.com' && data.password === 'password') {
        return { 
          data: { 
            token: 'mock-token', 
            user: { id: '1', username: 'testuser', email: 'test@example.com' } 
          } 
        };
      } else {
        throw { response: { data: { message: 'Invalid credentials' } } };
      }
    } else if (url === '/auth/signup') {
      return { 
        data: { 
          token: 'mock-token', 
          user: { id: '2', username: data.username, email: data.email } 
        } 
      };
    }
  }
};

// Optional: Define user type
interface User {
  id: string;
  username: string;
  email: string;
}

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let response;

      if (isLogin) {
        response = await axiosInstance.post('/auth/login', { email, password });
      } else {
        response = await axiosInstance.post('/auth/signup', { username, email, password });
      }

      const { token, user }: { token: string; user: User } = response.data;

      // For demo purposes, just show success message
      setMessage(`Success! User ${user.username} authenticated.`);
      
      // In a real app you'd store the token and redirect:
      // localStorage.setItem('token', token);
      // localStorage.setItem('user', JSON.stringify(user));
      // window.location.href = '/dashboard';
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Auth tabs */}
        <div className="flex">
          <button
            onClick={() => setIsLogin(true)}
            className={`w-1/2 py-4 text-center text-sm font-medium transition-colors duration-200 ease-in-out ${
              isLogin
                ? 'bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700 border-b border-gray-200'
            }`}
          >
            LOGIN
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`w-1/2 py-4 text-center text-sm font-medium transition-colors duration-200 ease-in-out ${
              !isLogin
                ? 'bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700 border-b border-gray-200'
            }`}
          >
            SIGN UP
          </button>
        </div>
        
        <div className="px-8 py-8">
          {/* Auth form header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-500 text-sm">
              {isLogin ? 'Sign in to access your account' : 'Register to get started'}
            </p>
          </div>
          
          {/* Auth form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required={!isLogin}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            {isLogin && (
              <div className="flex items-center justify-end">
                <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500">
                  Forgot your password?
                </a>
              </div>
            )}
            
            {message && (
              <div className={`${message.includes('Success') ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {message.includes('Success') ? (
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm ${message.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              className="ml-1 text-indigo-600 font-medium hover:text-indigo-500 focus:outline-none"
              onClick={toggleMode}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;