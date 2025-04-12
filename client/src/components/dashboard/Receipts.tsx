// Enhanced ReceiptsPage.tsx with Gmail integration, pagination, and limited categories

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import axiosInstance from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
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

const formatCurrency = (amount: number, currencyCode?: string): string => {
  try {
    const code = currencyCode || 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${currencyCode || '$'}${amount.toFixed(2)}`;
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
}

const categories = [
  'Food', 'Travel', 'Office Supplies', 'Entertainment', 'Utilities',
  'Healthcare', 'Education', 'Transportation', 'Subscriptions', 'Other'
];

const ReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const user = JSON.parse(localStorage.getItem('user') || '{"id":""}');
  const location = useLocation();

  const fetchAllReceipts = async () => {
    if (!user.id) return;
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/api/receipts/all/${user.id}`);
      setReceipts(response.data.receipts || []);
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      setError('Failed to load receipts');
    } finally {
      setIsLoading(false);
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
    try {
      const res = await axiosInstance.get(`/api/gmail/fetch-receipts/${user.id}`);
      if (res.data.success) {
        toast.success(`Fetched ${res.data.count} receipts`);
        fetchAllReceipts();
      }
    } catch (err) {
      console.error('Gmail fetch failed', err);
      toast.error('Failed to fetch Gmail receipts');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.id) {
      toast.error('User ID is missing. Please log in again.');
      return;
    }
    try {
      await axiosInstance.post(`/api/receipts/${user.id}/manual`, formData);
      toast.success('Receipt added successfully!');
      setFormData({ fileName: '', amount: '', currency: 'INR', vendor: '', orderNumber: '', receiptDate: '', category: 'Other', notes: '' });
      fetchAllReceipts();
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

  const filteredReceipts = receipts.filter(receipt => {
    if (activeTab === 'all') return true;
    if (activeTab === 'uploaded') return receipt.source === 'upload' || !receipt.source;
    if (activeTab === 'email') return receipt.source === 'email';
    return true;
  });

  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * receiptsPerPage,
    currentPage * receiptsPerPage
  );

  useEffect(() => {
    if (user.id) {
      fetchAllReceipts();
      getGmailAuthUrl();
    }
  }, [user.id]);

  return (
    <DashboardLayout user={user} onLogout={() => console.log('Logging out...')}>
      <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Receipts Dashboard</h1>

        <div className="mb-4 flex justify-between items-center">
          <div className="space-x-4">
            <button
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              onClick={handleRefreshGmail}
            >
              Fetch from Gmail
            </button>
            {gmailAuthUrl && (
              <a
                href={gmailAuthUrl}
                className="text-sm text-indigo-700 underline hover:text-indigo-900"
              >
                Connect Gmail
              </a>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Page {currentPage} of {Math.ceil(filteredReceipts.length / receiptsPerPage)}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="ml-4 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              className="ml-2 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              disabled={currentPage * receiptsPerPage >= filteredReceipts.length}
            >
              Next
            </button>
          </div>
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

        {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">{error}</div>}

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
                  <p className="text-sm text-gray-500">
                    {receipt.receiptDate ? `Date: ${new Date(receipt.receiptDate).toLocaleDateString()}` : ''}
                  </p>
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
          <input type="text" name="fileName" value={formData.fileName} onChange={handleChange} placeholder="File Name" required className="mb-4 p-2 border border-gray-300 rounded-md w-full" />
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="Amount" required className="mb-4 p-2 border border-gray-300 rounded-md w-full" />
          <input type="text" name="currency" value={formData.currency} onChange={handleChange} placeholder="Currency" className="mb-4 p-2 border border-gray-300 rounded-md w-full" />
          <input type="text" name="vendor" value={formData.vendor} onChange={handleChange} placeholder="Vendor" className="mb-4 p-2 border border-gray-300 rounded-md w-full" />
          <input type="text" name="orderNumber" value={formData.orderNumber} onChange={handleChange} placeholder="Order Number" className="mb-4 p-2 border border-gray-300 rounded-md w-full" />
          <input type="date" name="receiptDate" value={formData.receiptDate} onChange={handleChange} placeholder="Receipt Date" className="mb-2 p-2 border border-gray-300 rounded-md w-full" />
          <small className="text-xs text-gray-500 mb-4 block">Pick the purchase date of the receipt.</small>
          <select name="category" value={formData.category} onChange={handleChange} className="mb-4 p-2 border border-gray-300 rounded-md w-full">
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" className="mb-4 p-2 border border-gray-300 rounded-md w-full" />
          <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Add Receipt</button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ReceiptsPage;
