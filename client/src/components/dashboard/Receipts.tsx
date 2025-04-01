import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { getUploadedReceipts, getEmailReceipts, fetchReceiptsFromGmail, debugFetchRecentEmails } from '../../api/receipts';
import axiosInstance from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import ReceiptDetailModal from '../dashboard/components/ReceiptDetailModal';

// Define a base64 encoded placeholder image as fallback
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAMAAABOo35HAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyVpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDQ4OCwgMjAyMC8wNy8xMC0yMjowNjo1MyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIyLjAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6REQzNUE1OThENjI1MTFFQjg5NzlBRDRCQkM2QTFGQUMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6REQzNUE1OTlENjI1MTFFQjg5NzlBRDRCQkM2QTFGQUMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpERDM1QTU5NkQ2MjUxMUVCODk3OUFENEJCQzZBMUZBQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpERDM1QTU5N0Q2MjUxMUVCODk3OUFENEJCQzZBMUZBQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvV+BPEAAAGAUExURQAAAP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////xbxAioAAAA/dFJOUwABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/quDJaEAAApYSURBVHja7N3/X5JnHsDxKwRpaQipqZAKFJRZWuY281SHY6Wd5mGOyba1m83TtNOxnU3cOe3ctNq5mXdMN6+gJxFBBOT5/N59f1CA+9a+79fnvI1p73ter7uur/t791V80Be9lzQXEf4X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';

// Add this helper function to ensure full S3 URLs
const ensureFullS3Url = (url?: string): string => {
  if (!url) return PLACEHOLDER_IMAGE;
  
  // For debugging - log only once per URL
  if (!window._loggedUrls) window._loggedUrls = new Set();
  if (!window._loggedUrls.has(url)) {
    console.log("Original URL before processing:", url);
    window._loggedUrls.add(url);
  }
  
  try {
    // If it's already a full URL but missing region, fix it
    if (url.startsWith('http') && url.includes('s3.amazonaws.com')) {
      // Convert format from: https://digital-receipt-manager.s3.amazonaws.com/uploads/...
      // To: https://digital-receipt-manager.s3.ap-south-1.amazonaws.com/uploads/...
      return url.replace('s3.amazonaws.com', 's3.ap-south-1.amazonaws.com');
    }
    
    // If it's already a full URL with region, return it
    if (url.startsWith('http')) return url;
    
    // If it's a path like "uploads/file.jpg", convert to full S3 URL
    if (url.startsWith('uploads/')) {
      return `https://digital-receipt-manager.s3.ap-south-1.amazonaws.com/${url}`;
    }
    
    // If it's a path without "uploads/" prefix
    if (!url.startsWith('/')) {
      return `https://digital-receipt-manager.s3.ap-south-1.amazonaws.com/uploads/${url}`;
    }
    
    // If it's a local path starting with "/", try to serve it from your backend
    return `http://localhost:5000${url.startsWith('/') ? url : `/${url}`}`;
  } catch (error) {
    console.error("Error in ensureFullS3Url:", error);
    return PLACEHOLDER_IMAGE;
  }
};

// Add this to the global window object to track logged URLs
declare global {
  interface Window {
    _loggedUrls?: Set<string>;
  }
}

interface Receipt {
  snippet: any;
  vendor: string;
  amount: undefined;
  currency: boolean;
  _id?: string;  // MongoDB typically uses _id
  id?: string;   // Allow for either id format
  fileName?: string;
  fileUrl?: string;
  uploadedAt?: string;
  // Add email-specific fields
  source?: 'upload' | 'email';
  emailId?: string;
  subject?: string;
  from?: string;
  content?: string;
  receivedAt?: string | Date;
}

// Add this interface at the top of your file with other interfaces
interface DebugEmail {
  id: string;
  subject?: string;
  from?: string;
  receivedAt?: string;
  snippet?: string;
}

const ReceiptsPage: React.FC = () => {
  const [uploadedReceipts, setUploadedReceipts] = useState<Receipt[]>([]);
  const [emailReceipts, setEmailReceipts] = useState<Receipt[]>([]);
  const [loadingUploaded, setLoadingUploaded] = useState<boolean>(true);
  const [loadingEmail, setLoadingEmail] = useState<boolean>(true);
  const [refreshingEmails, setRefreshingEmails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gmailAuthUrl, setGmailAuthUrl] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{"id":""}');
  const location = useLocation();

  // Function to fetch Gmail auth URL
  const getGmailAuthUrl = async () => {
    try {
      if (!user.id) {
        console.error('Cannot get Gmail auth URL: No user ID available');
        return;
      }

      // Pass the userId as a query parameter
      const response = await axiosInstance.get(`/gmail/auth?userId=${user.id}`);
      setGmailAuthUrl(response.data.authUrl);
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

      setIsLoading(true);

      // Show loading toast
      toast.loading('Fetching receipts from Gmail...');

      // Call the API function
      const result = await fetchReceiptsFromGmail(user.id, user.token || '');

      if (result.success) {
        toast.success('Successfully fetched receipts from Gmail');
        // Refresh the email receipts list
        fetchEmailReceipts();
      } else {
        toast.error(`Failed to fetch receipts: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to refresh Gmail receipts:', error);
      toast.error('Failed to refresh Gmail receipts');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract the fetchEmailReceipts function from your useEffect to make it reusable
  const fetchEmailReceipts = async () => {
    try {
      setLoadingEmail(true);
      console.log('Fetching email receipts for user:', user.id);
      
      const response = await axiosInstance.get(`/receipts/email/${user.id}`);
      console.log("API RESPONSE FOR EMAIL RECEIPTS:", response);
      
      if (response.data.success) {
        console.log("Setting email receipts:", response.data.receipts);
        console.log("Number of receipts:", response.data.receipts?.length || 0);
        setEmailReceipts(response.data.receipts || []);
      } else {
        console.error("API call succeeded but returned error:", response.data.message);
        setError(response.data.message);
      }
    } catch (error) {
      console.error("Error fetching email receipts:", error);
      setError('Failed to load email receipts');
    } finally {
      setLoadingEmail(false);
    }
  };

  useEffect(() => {
    if (!user.id) return;

    // Check if we need Gmail auth URL on component mount - do this first
    getGmailAuthUrl();

    // Fetch uploaded receipts
    const fetchUploadedReceipts = async () => {
      try {
        setLoadingUploaded(true);
        const data = await getUploadedReceipts(user.id);
        setUploadedReceipts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching uploaded receipts:', err);
        setError('Failed to fetch uploaded receipts');
      } finally {
        setLoadingUploaded(false);
      }
    };

    fetchUploadedReceipts();
    fetchEmailReceipts();
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

      // Refresh email receipts
      if (user.id) {
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
  }, []);

  // Check for redirect parameters
  useEffect(() => {
    console.log('Checking for authentication redirect...');
    const searchParams = new URLSearchParams(location.search);
    const authStatus = searchParams.get('auth');
    const message = searchParams.get('message');
    const timestamp = searchParams.get('timestamp');

    if (authStatus === 'success') {
      console.log('✅ Gmail authentication successful!', timestamp);

      // Show success toast
      toast.success('Gmail connected successfully!');

      // Update state to reflect successful connection
      setIsGmailConnected(true);

      // Clean the URL to remove the query parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // You could trigger receipt fetching here
      if (user?.id) {
        handleRefreshGmail();
      }
    } else if (authStatus === 'error') {
      console.error('❌ Gmail authentication error:', message);

      // Show error toast
      toast.error(`Authentication failed: ${message || 'Unknown error'}`);

      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]); // This will run when the URL parameters change

  // Helper function to get unique key for each receipt
  const getUniqueKey = (receipt: Receipt, index: number) => {
    // Try to use existing IDs first, fall back to index if needed
    return receipt._id || receipt.id || `receipt-${index}`;
  };

  // Add this debug function
  const handleDebugFetchEmails = async () => {
    try {
      if (!user?.id) {
        console.error('Cannot fetch emails: No user ID available');
        return;
      }

      // Show loading toast with ID
      const toastId = toast.loading('Debug: Fetching recent emails...');

      // Call the debug API function
      const token = localStorage.getItem('token') || '';
      const result = await debugFetchRecentEmails(user.id, token);

      if (result.success) {
        // Show success toast with email info
        toast.success(`Found ${result.emails?.length || 0} recent emails`, { id: toastId });

        // Show more details in console
        console.log('Debug - Recent emails:', result.emails);

        // Display a simple modal or alert with the results
        if (result.emails?.length > 0) {
          const emailList = result.emails
            // Fix: Properly type the parameter e as DebugEmail
            .map((e: DebugEmail) => `- ${e.subject || 'No subject'} (from: ${e.from || 'Unknown'})`)
            .join('\n');

          alert(`Recent emails found:\n\n${emailList}`);
        } else {
          alert('No emails found in your Gmail account.');
        }
      } else {
        // Update loading toast to error
        toast.error(`Debug failed: ${result.message}`, { id: toastId });
      }
    } catch (error) {
      console.error('Error in debug function:', error);
      toast.error('Debug function failed');
    }
  };

  useEffect(() => {
    console.log("EMAIL RECEIPTS STATE:", emailReceipts);
  }, [emailReceipts]);

  useEffect(() => {
    console.log("Uploaded Receipts:", uploadedReceipts);
  }, [uploadedReceipts]);

  // Function to view email details
  const handleViewDetails = (emailId: string) => {
    console.log("handleViewDetails called with emailId:", emailId);
    console.log("Before setting state - showModal:", showModal, "selectedEmailId:", selectedEmailId);
    
    if (!emailId) {
      console.error("No valid email ID provided");
      return;
    }
    
    setSelectedEmailId(emailId);
    setShowModal(true);
    
    console.log("After setting state - This won't show the updated values due to React's state batching");
    
    // Use setTimeout to check values after state updates
    setTimeout(() => {
      console.log("After state updates (timeout) - showModal:", showModal, "selectedEmailId:", selectedEmailId);
    }, 100);
  };
  
  // Function to close modal
  const handleCloseModal = () => {
    setShowModal(false);
    // Optional: delay clearing the emailId to avoid flicker during animation
    setTimeout(() => setSelectedEmailId(null), 300);
  };

  return (
    <DashboardLayout user={user} onLogout={() => console.log('Logging out...')}>
      <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Receipts</h1>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 000 16zM8.707 7.293a1 1 000-1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
                      <path d="M4.293 4.293a1 1 011.414 0L10 8.586l4.293-4.293a1 1 011.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gmail Connection Status */}
        {isGmailConnected ? (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Gmail connected successfully!</p>
                <p className="text-sm mt-1">Your email receipts will appear below.</p>
                <div className="mt-3">
                  <button
                    onClick={handleRefreshGmail}
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="mr-1.5 -ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 11-1.885 0.666A5.002 5.002 0 005.999 7H9a1 1 010 2H4a1 1 01-1-1V3a1 1 011-1zm.008 9.057a1 1 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 110-2h5a1 1 011 1v5a1 1 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        Refresh from Gmail
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Your existing Gmail authorization required section
          gmailAuthUrl && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0118 0 9 9 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Gmail authorization required to fetch email receipts</p>
                  <p className="text-sm mt-1">Connect your Gmail account to automatically scan for receipts.</p>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        // Instead of using popup approach with window.closed checks which can be blocked
                        // Use direct window.location for authentication
                        window.location.href = gmailAuthUrl;

                        // Or if you prefer keeping the popup:
                        window.open(gmailAuthUrl, '_blank', 'width=600,height=700,noopener');

                        // Don't try to check popup.closed status - rely on URL parameters when user returns
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150"
                    >
                      <svg className="mr-2 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0016 4H4a2 2 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0112-2h12a2 2 0112-2V8.118z" />
                      </svg>
                      Connect to Gmail
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* Uploaded Receipts Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800">📤 Uploaded Receipts</h2>
          {loadingUploaded ? (
            <p className="text-gray-500">Loading...</p>
          ) : uploadedReceipts.length === 0 ? (
            <p className="text-gray-500 mt-2">No uploaded receipts found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {uploadedReceipts.map((receipt, index) => (
                <div key={getUniqueKey(receipt, index)} className="bg-gray-100 p-4 rounded-lg shadow">
                  <img
                    src={ensureFullS3Url(receipt.fileUrl)}
                    alt={receipt.fileName || 'Receipt'}
                    className="w-full h-40 object-cover rounded-md"
                    onError={(e) => {
                      // Prevent infinite error retries by checking if already attempted fix
                      const imgElement = e.currentTarget;
                      if (imgElement.dataset.attempted || imgElement.src === PLACEHOLDER_IMAGE) {
                        // Already tried once or using fallback, don't retry
                        return;
                      }
                      
                      // Mark as attempted to prevent loop
                      imgElement.dataset.attempted = 'true';
                      
                      // Try direct S3 URL as last resort
                      const originalUrl = receipt.fileUrl;
                      if (originalUrl && originalUrl.includes('amazonaws.com')) {
                        console.log("Trying direct URL:", originalUrl);
                        imgElement.src = originalUrl;
                      } else {
                        // Last resort - use fallback
                        imgElement.src = PLACEHOLDER_IMAGE;
                        imgElement.alt = 'Receipt image not available';
                      }
                    }}
                  />
                  <p className="text-sm text-gray-700 mt-2">{receipt.fileName || 'Unnamed receipt'}</p>
                  {/* For debugging, show the URL */}
                  <p className="text-xs text-gray-500 mt-1 truncate">{receipt.fileUrl || 'No URL'}</p>
                </div>
              ))}
              {/* Test image directly from S3 */}
              <div className="bg-gray-100 p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium mb-2">Test S3 Direct URL</h3>
                <img
                  src="https://digital-receipt-manager.s3.ap-south-1.amazonaws.com/uploads/1743257123973_2024-01-27.png"
                  alt="Test from S3"
                  className="w-full h-40 object-cover rounded-md"
                  onError={(e) => {
                    const imgElement = e.currentTarget;
                    if (imgElement.src === PLACEHOLDER_IMAGE) {
                      console.error("Already using fallback image, cannot load any image");
                      return;
                    }
                    console.warn("Test image failed to load, switching to fallback:", imgElement.src);
                    imgElement.src = PLACEHOLDER_IMAGE;
                    imgElement.alt = 'Test image not available';
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Email Receipts Section with Refresh Button */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">📩 Email Receipts</h2>
            <div className="flex space-x-2">
              {isGmailConnected ? (
                <button
                  onClick={handleRefreshGmail}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Refresh from Gmail
                    </>
                  )}
                </button>
              ) : (
                <a
                  href={gmailAuthUrl || '#'}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Connect Gmail
                </a>
              )}

              {/* Debug button */}
              <button
                onClick={handleDebugFetchEmails}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Debug: Fetch Recent Emails
              </button>
            </div>
          </div>

          {loadingEmail ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : emailReceipts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {emailReceipts.map((receipt, index) => (
                <div 
                  key={getUniqueKey(receipt, index)} 
                  className="relative bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => {
                    // Use the id property instead of emailId
                    const emailId = receipt.id || receipt.emailId;
                    if (emailId) {
                      handleViewDetails(emailId);
                    } else {
                      console.error("No id or emailId found for this receipt:", receipt);
                    }
                  }}
                >
                  {/* Use the fields that exist in your fetchReceipts return value */}
                  <h3 className="text-base font-medium text-gray-900 truncate">
                    {receipt.subject || 'No Subject'}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {receipt.from || 'Unknown Sender'}
                  </p>
                  <div className="mt-2 flex justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      {/* Simplified SVG icon */}
                      <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {receipt.receivedAt ? 
                        (typeof receipt.receivedAt === 'string' ? 
                          new Date(receipt.receivedAt).toLocaleDateString() : 
                          (receipt.receivedAt instanceof Date ? receipt.receivedAt.toLocaleDateString() : new Date(receipt.receivedAt || '').toLocaleDateString())
                        ) : 'Unknown date'}
                    </div>  
                    
                    {/* Add a snippet preview */}
                    <div className="mt-2 text-xs text-gray-500">
                      {receipt.snippet ? 
                        (receipt.snippet.length > 60 ? 
                          receipt.snippet.substring(0, 60) + '...' : 
                          receipt.snippet
                        ) : 'No preview available'}
                    </div>
                  </div>
                  
                  {/* Add a "View Details" button */}
                  <div className="mt-2 text-right">
                    <button 
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        e.preventDefault();
                        // Use the id property instead of emailId
                        const emailId = receipt.id || receipt.emailId;
                        console.log("View Details button clicked for email:", emailId);
                        
                        // Make sure id exists
                        if (!emailId) {
                          console.error("No id or emailId found for this receipt:", receipt);
                          return;
                        }
                        
                        // Direct function calls instead of using the handler
                        setSelectedEmailId(emailId);
                        setShowModal(true);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-600">No email receipts found.</p>
              {!isGmailConnected && gmailAuthUrl && (
                <div className="mt-4">
                  <a href={gmailAuthUrl} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Connect Your Gmail Account
                  </a>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      {/* Replace the simple test modal with the actual ReceiptDetailModal component */}
{showModal && selectedEmailId && (
  <ReceiptDetailModal
    userId={user.id}
    emailId={selectedEmailId}
    onClose={handleCloseModal}
  />
)}
    </DashboardLayout>
  );
};

export default ReceiptsPage;


