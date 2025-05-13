// Enhanced ReceiptsPage.tsx with Gmail integration, pagination, and limited categories

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import axiosInstance from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import ReceiptDetailModal from '../dashboard/components/ReceiptDetailModal';

const PLACEHOLDER_IMAGE = 'data:image/png;base64,...';

const ensureFullS3Url = (url?: string): string => {
  if (!url) return PLACEHOLDER_IMAGE;
  try {
    if (url.startsWith('data:')) return url;
    if (url.includes('amazonaws.com')) return url;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
      return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`;
    }
    const isFilename = !url.includes('/') && /\.(jpg|jpeg|png|pdf)$/i.test(url);
    if (isFilename || url.startsWith('uploads/')) {
      const path = url.startsWith('uploads/') ? url : `uploads/${url}`;
      return `https://digital-receipt-manager.s3.ap-south-1.amazonaws.com/${path}`;
    }
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${url.replace(/^\//, '')}`;
  } catch (error) {
    console.error("Error in ensureFullS3Url:", error, "URL was:", url);
    return PLACEHOLDER_IMAGE;
  }
};

// Fix the formatCurrency function to handle invalid currency codes
const formatCurrency = (amount: number, currencyCode?: string): string => {
  try {
    // Make sure the currency code is valid (3 letters)
    // Most common currency codes are 3 letters (USD, EUR, INR, etc.)
    if (currencyCode && /^[A-Z]{3}$/i.test(currencyCode)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode.toUpperCase()
      }).format(amount);
    } else {
      // Fallback for invalid currency codes
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount).replace('$', currencyCode || '₹');
    }
  } catch (error) {
    console.error('Currency formatting error:', error);
    // Safe fallback that won't crash
    return `${currencyCode || '₹'}${amount.toFixed(2)}`;
  }
};

interface Receipt {
  _id?: string;
  fileName?: string;
  fileKey?: string;
  fileUrl?: string;
  uploadedAt?: string;
  source?: 'upload' | 'email' | 'manual';
  emailId?: string;
  subject?: string;
  from?: string;
  content?: string;
  receivedAt?: string | Date;
  extractedText?: string;
  isProcessed?: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  vendor?: string;
  amount?: number;
  currency?: string;
  snippet?: string;
  receiptDate?: string;
  category?: string;
}

const categories = [
  'Food', 'Travel', 'Office Supplies', 'Entertainment', 'Utilities',
  'Healthcare', 'Education', 'Transportation', 'Subscriptions', 'Other'
];

// Mock receipt data for when the API fails
const mockReceiptData: Receipt[] = [
  {
    _id: 'mock-1',
    vendor: 'Amazon',
    amount: 199.99,
    currency: 'INR',
    receiptDate: '2025-04-15',
    source: 'email',
    category: 'Shopping'
  },
  {
    _id: 'mock-2',
    vendor: 'Uber',
    amount: 25.50,
    currency: 'INR',
    receiptDate: '2025-04-12',
    source: 'email',
    category: 'Travel'
  },
  {
    _id: 'mock-3',
    vendor: 'Office Depot',
    amount: 79.95,
    currency: 'INR',
    receiptDate: '2025-04-10',
    source: 'upload',
    category: 'Office Supplies'
  }
];

const ReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingGmail, setIsFetchingGmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'uploaded' | 'email'>('all');
  const [formData, setFormData] = useState({
    fileName: '',
    amount: '',
    currency: 'INR',
    vendor: '',
    orderNumber: '',
    receiptDate: '',
    category: 'Other',
    notes: '',
  });
  const [gmailAuthUrl, setGmailAuthUrl] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const receiptsPerPage = 6;
  const [useMockData, setUseMockData] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{"id":""}');
  const location = useLocation();
  const navigate = useNavigate();

  const fetchAllReceipts = async () => {
    if (!user.id && !useMockData) return;

    try {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axiosInstance.get(`/api/receipts/all/${user.id}`);
        setReceipts(response.data.receipts || []);
        setUseMockData(false);
      } catch (err) {
        console.error('Error fetching receipts:', err);
        // Fall back to mock data if API fails
        setReceipts(mockReceiptData);
        setUseMockData(true);
        setError('Using demo data - API connection failed. This is a preview only.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkGmailConnection = async () => {
    if (!user.id) return;

    try {
      const response = await axiosInstance.get(`/api/gmail/status/${user.id}`);
      
      if (response.data.connected) {
        setIsGmailConnected(true);
        // If Gmail is connected but we've stored an auth URL, clear it
        if (gmailAuthUrl) {
          setGmailAuthUrl(null);
        }
      } else {
        setIsGmailConnected(false);
        getGmailAuthUrl();
      }
    } catch (err) {
      console.error('Failed to check Gmail connection status', err);
      setIsGmailConnected(false);
      getGmailAuthUrl();
    }
  };

  const getGmailAuthUrl = async () => {
    try {
      const res = await axiosInstance.get(`/api/gmail/auth?userId=${user.id}`);
      setGmailAuthUrl(res.data.authUrl);
    } catch (err) {
      console.error('Failed to get Gmail auth URL', err);
    }
  };

  const handleRefreshGmail = async () => {
    if (!user.id) {
      toast.error('Please log in to fetch emails');
      return;
    }

    try {
      setIsFetchingGmail(true);
      const toastId = toast.loading('Fetching emails from Gmail... This may take up to a minute');

      // Add timestamp as cache-busting parameter to force fresh data
      const timestamp = new Date().getTime();
      
      try {
        // Fetch the latest 50 emails that might contain receipts
        const res = await axiosInstance.get(
          `/api/gmail/fetch-receipts/${user.id}?limit=50&_t=${timestamp}`,
          { timeout: 60000 } // 60 second timeout
        );

        if (res.data && res.data.success) {
          toast.success(`Fetched ${res.data.count || 0} receipts from Gmail`, { id: toastId });
          fetchAllReceipts(); // Refresh the receipts list
        } else {
          toast.error(res.data?.message || 'Failed to fetch Gmail receipts', { id: toastId });
          
          // Check if authentication is required
          if (res.data?.authRequired) {
            checkGmailConnection(); // Re-check connection status to get auth URL
            
            setTimeout(() => {
              if (gmailAuthUrl) {
                toast((t) => (
                  <span className="flex flex-col">
                    Gmail authentication required
                    <a 
                      href={gmailAuthUrl} 
                      className="text-blue-500 underline mt-1"
                    >
                      Click here to connect Gmail
                    </a>
                  </span>
                ), { duration: 8000 });
              }
            }, 1000);
          }
        }
      } catch (err: any) {
        console.error('Gmail fetch failed:', err);
        
        // Handle timeout specifically
        if (err.code === 'ECONNABORTED') {
          toast.error('Request timed out. Processing emails is taking longer than expected. Try with fewer emails.', { id: toastId });
        } 
        // Handle specific errors
        else if (err.response?.status === 403) {
          toast.error('Access to Gmail denied. You may need to be added as a test user in Google Cloud Console.', { id: toastId });
        } else if (err.response?.status === 401) {
          toast.error('Gmail authentication required. Please reconnect your account.', { id: toastId });
          checkGmailConnection();
        } else {
          toast.error('Failed to fetch Gmail receipts. Please try again later.', { id: toastId });
        }
      }
    } finally {
      setIsFetchingGmail(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.id && !useMockData) {
      toast.error('User ID is missing. Please log in again.');
      return;
    }

    try {
      if (useMockData) {
        // Add mock receipt in demo mode
        const newReceipt: Receipt = {
          _id: `mock-${Date.now()}`,
          vendor: formData.vendor,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          receiptDate: formData.receiptDate,
          category: formData.category,
          source: 'manual'
        };

        setReceipts([newReceipt, ...receipts]);
        toast.success('Receipt added successfully (demo mode)!');
      } else {
        // Add real receipt via API
        await axiosInstance.post(`/api/receipts/${user.id}/manual`, formData);
        toast.success('Receipt added successfully!');
        fetchAllReceipts();
      }

      // Reset form in both cases
      setFormData({
        fileName: '',
        amount: '',
        currency: 'INR',
        vendor: '',
        orderNumber: '',
        receiptDate: '',
        category: 'Other',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding receipt:', error);
      toast.error('Failed to add receipt');
    }
  };

  const handleViewDetails = (receiptId: string) => {
    setSelectedReceiptId(receiptId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedReceiptId(null), 300);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Filter receipts based on the active tab
  const filteredReceipts = receipts.filter(receipt => {
    if (activeTab === 'all') return true;
    if (activeTab === 'uploaded') return receipt.source === 'upload' || !receipt.source;
    if (activeTab === 'email') return receipt.source === 'email';
    return true;
  });

  // Get current page receipts for pagination
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * receiptsPerPage,
    currentPage * receiptsPerPage
  );

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / receiptsPerPage));

  useEffect(() => {
    if (user.id) {
      fetchAllReceipts();
      checkGmailConnection();
    } else if (!user.id) {
      // Handle case when user is not logged in
      setUseMockData(true);
      setReceipts(mockReceiptData);
      setError('Using demo data - Please log in to access your receipts.');
      setIsLoading(false);
    }

    // Check for category filter from state (e.g. when navigating from Categories page)
    const state = location.state as { categoryFilter?: string } | undefined;
    if (state?.categoryFilter) {
      // Filter receipts by category
      // This would be implemented with a categoryFilter state if needed
    }
  }, [user.id]);

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Receipts Dashboard</h1>

        {error && (
          <div className={`mb-4 p-3 rounded-md ${useMockData ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
          <div className="space-x-4">
            <button
              className={`${isFetchingGmail
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
                } text-white px-4 py-2 rounded flex items-center`}
              onClick={handleRefreshGmail}
              disabled={isFetchingGmail}
            >
              {isFetchingGmail && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isFetchingGmail ? 'Fetching...' : 'Fetch from Gmail'}
            </button>
            {gmailAuthUrl && !isGmailConnected && (
              <a
                href={gmailAuthUrl}
                className="inline-block bg-white border border-indigo-600 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-50"
              >
                Connect Gmail Account
              </a>
            )}
            {isGmailConnected && (
              <span className="text-sm text-green-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Gmail Connected
              </span>
            )}
          </div>

          {filteredReceipts.length > 0 && (
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={`ml-4 px-2 py-1 rounded ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={`ml-2 px-2 py-1 rounded ${currentPage >= totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {['all', 'uploaded', 'email'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as any); setCurrentPage(1); }}
                className={`${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Receipts
              </button>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : paginatedReceipts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No receipts found</h3>
            <p className="mt-1 text-sm text-gray-500">Try uploading or connecting Gmail to fetch receipts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedReceipts.map((receipt, index) => (
              <div
                key={receipt._id || index}
                className="bg-white overflow-hidden rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => receipt._id && handleViewDetails(receipt._id)}
              >
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {receipt.vendor || receipt.fileName || 'Receipt'}
                  </h3>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-gray-500">
                      {receipt.receiptDate ? `Date: ${new Date(receipt.receiptDate).toLocaleDateString()}` : ''}
                    </p>
                    {receipt.amount && (
                      <span className="font-medium text-indigo-700">
                        {formatCurrency(receipt.amount, receipt.currency)}
                      </span>
                    )}
                  </div>
                  {receipt.category && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {receipt.category}
                      </span>
                    </div>
                  )}
                  {receipt.source && (
                    <div className="mt-2 text-xs text-gray-500">
                      Source: {receipt.source.charAt(0).toUpperCase() + receipt.source.slice(1)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && selectedReceiptId && (
        <ReceiptDetailModal
          userId={user.id}
          emailId={selectedReceiptId}
          onClose={handleCloseModal}
        />
      )}

      <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6 mt-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Manual Receipt Entry</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
              <input
                type="text"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                placeholder="e.g. Amazon, Walmart"
                className="p-2 border border-gray-300 rounded-md w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Name</label>
              <input
                type="text"
                name="fileName"
                value={formData.fileName}
                onChange={handleChange}
                placeholder="e.g. Monthly Grocery"
                className="p-2 border border-gray-300 rounded-md w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                required
                className="p-2 border border-gray-300 rounded-md w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                placeholder="e.g. INR, USD"
                className="p-2 border border-gray-300 rounded-md w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
              <input
                type="text"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                placeholder="Optional order/invoice number"
                className="p-2 border border-gray-300 rounded-md w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Date</label>
              <input
                type="date"
                name="receiptDate"
                value={formData.receiptDate}
                onChange={handleChange}
                className="p-2 border border-gray-300 rounded-md w-full"
              />
              <small className="text-xs text-gray-500">Pick the purchase date of the receipt.</small>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="p-2 border border-gray-300 rounded-md w-full"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional information"
              className="p-2 border border-gray-300 rounded-md w-full"
              rows={3}
            />
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Receipt
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ReceiptsPage;
