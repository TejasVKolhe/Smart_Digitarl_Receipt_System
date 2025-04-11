import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { fetchReceiptsFromGmail } from '../../api/receipts';
import axiosInstance from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import ReceiptDetailModal from '../dashboard/components/ReceiptDetailModal';

// Define a base64 encoded placeholder image as fallback
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAMAAABOo35HAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyVpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDQ4OCwgMjAyMC8wNy8xMC0yMjowNjo1MyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIyLjAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6REQzNUE1OThENjI1MTFFQjg5NzlBRDRCQkM2QTFGQUMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6REQzNUE1OTlENjI1MTFFQjg5NzlBRDRCQkM2QTFGQUMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpERDM1QTU5NkQ2MjUxMUVCODk3OUFENEJCQzZBMUZBQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpERDM1QTU5N0Q2MjUxMUVCODk3OUFENEJCQzZBMUZBQyIvPiA8L3JkZjpEZXNjcmlwdGlvbiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+9X4E8QAAAYBQTFJFAAAA///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8W8QIqAAAAP3RSU5TAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUnJygpKisvLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/quDJaEAAApYSURBVHja7N3/X5JnHsDxKwRpaQipqZAKFJRZWuY281SHY6Wd5mGOyba1m83TtNOxnU3cOe3ctNq5mXdMN6+gJxFBBOT5/N59f1CA+9a+79fnvI1p73ter7uur/t791V80Be9lzQXEf4X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';

// Add this helper function to ensure full S3 URLs
const ensureFullS3Url = (url?: string): string => {
  if (!url) return PLACEHOLDER_IMAGE;

  try {
    // For debugging
    console.log('Original URL:', url);
    
    // Check for data URLs (already complete)
    if (url.startsWith('data:')) return url;
    
    // Handle full S3 URLs already
    if (url.includes('amazonaws.com')) return url;
    
    // Handle full HTTP URLs
    if (url.startsWith('http')) return url;
    
    // Handle relative paths to backend server
    if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
      return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`;
    }
    
    // Check if it's just a filename
    const isFilename = !url.includes('/') && (
      url.endsWith('.jpg') || url.endsWith('.jpeg') || 
      url.endsWith('.png') || url.endsWith('.pdf')
    );
    
    // Handle an S3 key
    if (isFilename || url.startsWith('uploads/')) {
      // Construct proper S3 URL with bucket
      const path = url.startsWith('uploads/') ? url : `uploads/${url}`;
      return `https://digital-receipt-manager.s3.ap-south-1.amazonaws.com/${path}`;
    }
    
    // Default case - assume it's a backend path
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${url.replace(/^\//, '')}`;
  } catch (error) {
    console.error("Error in ensureFullS3Url:", error, "URL was:", url);
    return PLACEHOLDER_IMAGE;
  }
};

// Add this helper function to safely format currency
const formatCurrency = (amount: number, currencyCode?: string): string => {
  try {
    // Clean up currency code if it exists
    let code = 'USD'; // Default fallback
    
    if (currencyCode) {
      // If it's a currency symbol like $, convert to proper code
      if (currencyCode === '$') code = 'USD';
      else if (currencyCode === '€') code = 'EUR';
      else if (currencyCode === '£') code = 'GBP';
      else if (currencyCode === '¥') code = 'JPY';
      else if (currencyCode === '₹') code = 'INR';
      // If it's already a valid 3-letter code, use it
      else if (/^[A-Z]{3}$/.test(currencyCode)) code = currencyCode;
    }
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: code
    }).format(amount);
  } catch (error) {
    // Fallback if formatting fails
    console.error('Currency formatting error:', error);
    return `${currencyCode || '$'}${amount.toFixed(2)}`;
  }
};

// Add this function to debug image URLs
const logImageUrls = (receipts: Receipt[]) => {
  const imageUrls = receipts
    .filter(r => r.fileUrl || r.fileKey)
    .map(r => ({
      original: {
        fileUrl: r.fileUrl,
        fileKey: r.fileKey
      },
      processed: {
        fileUrl: r.fileUrl ? ensureFullS3Url(r.fileUrl) : undefined,
        fileKey: r.fileKey ? ensureFullS3Url(r.fileKey) : undefined
      }
    }));
  
  console.log('Receipt image URLs:', imageUrls);
  return imageUrls;
};

interface Receipt {
  _id?: string;  // MongoDB typically uses _id
  id?: string;   // Allow for either id format
  fileName?: string;
  fileKey?: string;
  fileUrl?: string;
  uploadedAt?: string;
  source?: 'upload' | 'email';
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
  snippet?: string; // This is for email previews
}

const ReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gmailAuthUrl, setGmailAuthUrl] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [refreshingEmails, setRefreshingEmails] = useState<boolean>(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'uploaded' | 'email'>('all');
  const [gmailConnectionStatus, setGmailConnectionStatus] = useState<{
    connected: boolean;
    lastSync?: Date | null;
    needsReconnect?: boolean;
  }>({ connected: false });

  const user = JSON.parse(localStorage.getItem('user') || '{"id":""}');
  const location = useLocation();

  // Function to fetch all receipts (both uploaded and email)
  const fetchAllReceipts = async () => {
    if (!user.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all receipts for the user
      const response = await axiosInstance.get(`/api/receipts/all/${user.id}`);

      if (response.data && response.data.receipts) {
        console.log("All receipts loaded:", response.data.receipts);
        
        // Log sources of receipts to debug why emails aren't showing
        const sourceTypes = response.data.receipts.map((r: any) => r.source || 'undefined');
        const sourceCounts = sourceTypes.reduce((acc: any, src: string) => {
          acc[src] = (acc[src] || 0) + 1;
          return acc;
        }, {});
        console.log("Receipt sources breakdown:", sourceCounts);
        
        setReceipts(response.data.receipts || []);
      } else {
        console.error("API response format is unexpected:", response.data);
        setError('Unexpected response format from server');
      }
    } catch (error: any) {
      console.error("Error fetching receipts:", error);
      if (error.response?.status === 404) {
        // The endpoint might not exist yet
        console.log("Receipts endpoint not found, will create mock data");
        // Set empty receipts array instead of failing
        setReceipts([]);
      } else {
        setError('Failed to load receipts data: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch Gmail auth URL with better error handling
  const getGmailAuthUrl = async () => {
    try {
      if (!user.id) {
        console.error('Cannot get Gmail auth URL: No user ID available');
        return;
      }

      try {
        // Pass the userId as a query parameter
        const response = await axiosInstance.get(`/api/gmail/auth?userId=${user.id}`);
        
        if (response.data && response.data.authUrl) {
          console.log('Received Gmail auth URL');
          // Simply store the URL - we'll use a regular link navigation
          setGmailAuthUrl(response.data.authUrl);
        } else if (response.data && response.data.error) {
          console.error('Gmail configuration error:', response.data.error);
          setError(response.data.message || 'Gmail is not properly configured on the server');
        } else {
          console.error('Auth URL response format unexpected:', response.data);
        }
      } catch (error: any) {
        console.error('Error getting Gmail auth URL:', error);
        
        // Show specific error for Gmail configuration issues
        if (error.response?.data?.error === 'Gmail API configuration missing') {
          setError('Gmail integration is not properly configured. Please contact the administrator.');
        }
      }
    } catch (err) {
      console.error('Failed to get Gmail auth URL:', err);
    }
  };

  // Function to manually refresh Gmail receipts
  const handleRefreshGmail = async () => {
    try {
      if (!user?.id) {
        console.error('Cannot refresh Gmail receipts: No user ID available');
        return;
      }

      setRefreshingEmails(true);
      const loadingToast = toast.loading('Fetching receipts from Gmail...');

      // Call the API function
      const response = await axiosInstance.get(`/api/gmail/fetch-receipts/${user.id}`);
      toast.dismiss(loadingToast);

      if (response.data.success) {
        toast.success(`Successfully fetched ${response.data.count || 0} new receipts from Gmail`);
        // Update connection status after successful fetch
        checkGmailConnectionStatus();
        // Refresh the receipts list to include new email receipts
        fetchAllReceipts();
      } else if (response.data.needsReconnect) {
        toast.error('Gmail authorization expired. Please reconnect your account.');
        setGmailConnectionStatus({ connected: false, needsReconnect: true });
        setIsGmailConnected(false);
        getGmailAuthUrl(); // Get a fresh auth URL
      } else {
        toast.error(`Failed to fetch receipts: ${response.data.error || 'Unknown error'}`);
        setError(response.data.error || 'Failed to fetch receipts from Gmail');
      }
    } catch (error: any) {
      console.error('Failed to refresh Gmail receipts:', error);
      
      // Handle expired token case
      if (error.response?.status === 401 || 
          error.response?.data?.needsReconnect ||
          error.response?.data?.error?.includes('authorization expired')) {
        toast.error('Gmail authorization expired. Please reconnect your account.');
        setGmailConnectionStatus({ connected: false, needsReconnect: true });
        setIsGmailConnected(false);
        getGmailAuthUrl(); // Get a fresh auth URL
      } else {
        toast.error('Failed to refresh Gmail receipts');
        setError('An unexpected error occurred while fetching Gmail receipts');
      }
    } finally {
      setRefreshingEmails(false);
    }
  };

  // Function to check Gmail connection status
  const checkGmailConnectionStatus = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axiosInstance.get(`/api/gmail/status/${user.id}`);
      console.log('Gmail connection status:', response.data);
      
      setGmailConnectionStatus({
        connected: response.data.connected,
        lastSync: response.data.lastSync ? new Date(response.data.lastSync) : null,
        needsReconnect: response.data.needsReconnect
      });
      
      // Update the isGmailConnected state for backwards compatibility
      setIsGmailConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking Gmail connection status:', error);
      setIsGmailConnected(false);
    }
  };

  // Function to handle Gmail disconnect
  const handleDisconnectGmail = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axiosInstance.post(`/api/gmail/disconnect/${user.id}`);
      
      if (response.data.success) {
        toast.success('Gmail disconnected successfully');
        setGmailConnectionStatus({ connected: false });
        setIsGmailConnected(false);
      } else {
        toast.error('Failed to disconnect Gmail');
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast.error('Failed to disconnect Gmail');
    }
  };

  // Filter receipts based on active tab
  const filteredReceipts = receipts.filter(receipt => {
    if (activeTab === 'all') return true;
    if (activeTab === 'uploaded') return receipt.source === 'upload' || !receipt.source;
    if (activeTab === 'email') return receipt.source === 'email';
    return true;
  });
  
  // Log filtered receipts when tab changes
  useEffect(() => {
    console.log(`Tab changed to ${activeTab}. Showing ${filteredReceipts.length} of ${receipts.length} receipts`);
  }, [activeTab, filteredReceipts.length, receipts.length]);

  useEffect(() => {
    if (!user.id) return;

    // Check if we need Gmail auth URL on component mount
    getGmailAuthUrl();

    // Fetch all receipts (both uploaded and email)
    fetchAllReceipts();
  }, [user.id]);

  // Check for auth success in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');

    if (authStatus === 'success') {
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show success message
      toast.success('Gmail connected successfully!');
      setIsGmailConnected(true);

      // Refresh receipts
      if (user.id) {
        // Fetch Gmail receipts right away
        handleRefreshGmail();
      }
    } else if (authStatus === 'error') {
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show error message
      const errorMsg = params.get('message') || 'Unknown error during Gmail authentication.';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  }, [location.search, user.id]);

  useEffect(() => {
    if (user?.id) {
      // Check Gmail connection status on component mount
      checkGmailConnectionStatus();
    }
  }, [user?.id]);

  // Helper function to get unique key for each receipt
  const getUniqueKey = (receipt: Receipt, index: number) => {
    // Try to use existing IDs first, fall back to index if needed
    return receipt._id || receipt.id || `receipt-${index}`;
  };

  // Function to view receipt details
  const handleViewDetails = (receiptId: string) => {
    console.log("handleViewDetails called with receiptId:", receiptId);

    if (!receiptId) {
      console.error("No valid receipt ID provided");
      return;
    }

    setSelectedReceiptId(receiptId);
    setShowModal(true);
  };

  // Function to close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedReceiptId(null), 300);
  };

  // Handle tab change
  const handleTabChange = (tab: 'all' | 'uploaded' | 'email') => {
    setActiveTab(tab);
  };

  return (
    <DashboardLayout user={user} onLogout={() => console.log('Logging out...')}>
      <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Receipts Dashboard</h1>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 000 16zM8.707 7.293a1 1 000-1.414 1.414L8.586 10l-1.293 1.293a1 1 001.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 000-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4.293 4.293a1 1 011.414 0L10 8.586l4.293-4.293a1 1 011.414 1.414L11.414 10l4.293 4.293a1 1 011.414-1.414L10 11.414l-4.293 4.293a1 1 011.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gmail Connection Status */}
        {!gmailConnectionStatus.connected && (
          <div className="mb-6">
            {gmailAuthUrl ? (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Gmail authorization required to fetch email receipts</p>
                    <p className="text-sm mt-1">Connect your Gmail account to automatically scan for receipts.</p>
                    <div className="mt-3">
                      {/* Use a regular anchor tag for a full page redirect */}
                      <a
                        href={gmailAuthUrl}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150"
                      >
                        <svg className="mr-2 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0016 4H4a2 2 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 002 2h12a2 2 002-2V8.118z" />
                        </svg>
                        Connect to Gmail
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Gmail connection unavailable</p>
                    <p className="text-sm mt-1">
                      The Gmail integration is not properly configured. Please ensure the server has valid Gmail API credentials.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs to filter receipts */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('all')}
              className={`${
                activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All Receipts
            </button>
            <button
              onClick={() => handleTabChange('uploaded')}
              className={`${
                activeTab === 'uploaded'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Uploaded Receipts
            </button>
            <button
              onClick={() => handleTabChange('email')}
              className={`${
                activeTab === 'email'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Email Receipts
            </button>
          </nav>
        </div>

        {/* Gmail Refresh Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleRefreshGmail}
            disabled={refreshingEmails || !user.id || !gmailConnectionStatus.connected}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!gmailConnectionStatus.connected ? 'Connect Gmail first to refresh receipts' : ''}
          >
            {refreshingEmails ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="mr-2 -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 015.357-2m-5.357 2H15" />
                </svg>
                {gmailConnectionStatus.lastSync ? 'Refresh Receipts' : 'Fetch Receipts'}
              </>
            )}
          </button>
        </div>

        {/* Receipts Display */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 01-2-2V5a2 2 01-2-2h5.586a1 1 01.707.293l5.414 5.414a1 1 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No receipts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'all' ? 'You have no receipts yet.' : 
               activeTab === 'uploaded' ? 'Try uploading some receipts.' : 
               'Connect your Gmail to import receipts from your emails.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredReceipts.map((receipt, index) => (
              <div 
                key={getUniqueKey(receipt, index)} 
                className="bg-white overflow-hidden rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => receipt._id && handleViewDetails(receipt._id)}
              >
                {/* Receipt Image (if available) */}
                {(receipt.fileUrl || receipt.fileKey) && (
                  <div className="h-48 bg-gray-200 overflow-hidden relative">
                    <img
                      src={ensureFullS3Url(receipt.fileUrl || receipt.fileKey)}
                      alt={receipt.fileName || 'Receipt'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('Image loading error for:', receipt.fileUrl || receipt.fileKey);
                        
                        const imgElement = e.currentTarget;
                        
                        // Try alternative URL if available
                        if (receipt.fileUrl && receipt.fileKey && receipt.fileUrl !== receipt.fileKey) {
                          if (imgElement.src.includes(receipt.fileUrl)) {
                            console.log('Trying fileKey instead:', receipt.fileKey);
                            imgElement.src = ensureFullS3Url(receipt.fileKey);
                          } else if (imgElement.src.includes(receipt.fileKey)) {
                            console.log('Trying fileUrl instead:', receipt.fileUrl);
                            imgElement.src = ensureFullS3Url(receipt.fileUrl);
                          } else {
                            imgElement.src = PLACEHOLDER_IMAGE;
                          }
                        } else {
                          imgElement.src = PLACEHOLDER_IMAGE;
                        }
                      }}
                    />
                    {/* Loading overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 text-white opacity-0 transition-opacity duration-300" id={`loading-${index}`}>
                      <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                )}
                
                {/* Receipt Details */}
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      {/* Title - use various properties with fallbacks */}
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {receipt.vendor || receipt.subject || receipt.fileName || 'Receipt'}
                      </h3>
                      
                      {/* Source indicator */}
                      <div className="mt-1 flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          receipt.source === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {receipt.source === 'email' ? 'Email' : 'Uploaded'}
                        </span>
                        
                        {/* Processing status if available */}
                        {receipt.processingStatus && (
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            receipt.processingStatus === 'completed' ? 'bg-green-100 text-green-800' : 
                            receipt.processingStatus === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {receipt.processingStatus.charAt(0).toUpperCase() + receipt.processingStatus.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Amount if available */}
                    {receipt.amount && (
                      <div className="text-right">
                        <span className="text-lg font-semibold text-gray-900">
                          {typeof receipt.amount === 'number' 
                            ? formatCurrency(receipt.amount, receipt.currency)
                            : receipt.amount
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Additional receipt details */}
                  <div className="mt-3 space-y-1">
                    {/* From (for email receipts) */}
                    {receipt.from && (
                      <p className="text-sm text-gray-600 truncate">
                        From: {receipt.from}
                      </p>
                    )}
                    
                    {/* Date */}
                    <p className="text-sm text-gray-500">
                      {receipt.receivedAt ? 
                        `Received: ${new Date(receipt.receivedAt).toLocaleDateString()}` : 
                        receipt.uploadedAt ? 
                        `Uploaded: ${new Date(receipt.uploadedAt).toLocaleDateString()}` :
                        ''}
                    </p>
                    
                    {/* Extracted text preview if available */}
                    {receipt.extractedText && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500">Extracted Text:</h4>
                        <p className="text-sm text-gray-700 line-clamp-3 mt-1">
                          {receipt.extractedText.length > 150 
                            ? receipt.extractedText.substring(0, 150) + '...' 
                            : receipt.extractedText}
                        </p>
                      </div>
                    )}
                    
                    {/* Email snippet if available */}
                    {!receipt.extractedText && receipt.snippet && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500">Preview:</h4>
                        <p className="text-sm text-gray-700 line-clamp-3 mt-1">
                          {receipt.snippet.length > 150 
                            ? receipt.snippet.substring(0, 150) + '...' 
                            : receipt.snippet}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* View details button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        const receiptId = receipt._id || receipt.id;
                        if (receiptId) {
                          handleViewDetails(receiptId);
                        }
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Detail Modal */}
      {showModal && selectedReceiptId && (
        <ReceiptDetailModal
          userId={user.id}
          emailId={selectedReceiptId}
          onClose={handleCloseModal}
        />
      )}
    </DashboardLayout>
  );
};

export default ReceiptsPage;


