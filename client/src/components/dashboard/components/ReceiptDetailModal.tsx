// File: ReceiptDetailModal.tsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/axios';

// You might need to import your Spinner component properly
const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500"></div>
);

interface ReceiptDetailModalProps {
  userId: string;
  emailId: string;
  onClose: () => void;
}

interface ReceiptDetail {
  _id: string;
  vendor: string;
  amount: number;
  currency: string;
  receiptDate: string;
  orderNumber: string;
  subject: string;
  from: string;
  receivedAt: string;
  snippet: string;
  category: string;
  tags: string[];
  notes: string;
  source?: string;
  extractedText?: string;
  fileUrl?: string;
  fileKey?: string;
  fileName?: string;
}

// Add helper function to ensure full S3 URLs
const ensureFullS3Url = (url?: string): string | null => {
  if (!url) return null;

  try {
    // If it's already a full URL but missing region, fix it
    if (url.startsWith('http') && url.includes('s3.amazonaws.com')) {
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
    return null;
  }
};

const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({ userId, emailId, onClose }) => {
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    vendor: '',
    amount: 0,
    currency: '',
    category: '',
    notes: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchReceiptDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching receipt details for userId=${userId}, emailId=${emailId}`);
        
        const response = await axiosInstance.get(`/api/receipts/${userId}/${emailId}`);

        if (response.data && response.data.success) {
          const receiptData = response.data.receipt;
          setReceipt(receiptData);
          
          setFormData({
            vendor: receiptData.vendor || '',
            amount: receiptData.amount || 0,
            currency: receiptData.currency || 'INR',
            category: receiptData.category || 'Uncategorized',
            notes: receiptData.notes || ''
          });
        } else {
          console.error("API returned error:", response.data?.message || "Unknown error");
          setError(response.data?.message || 'Failed to load receipt details');
        }
      } catch (error: any) {
        console.error("Error fetching receipt details:", error);
        const statusCode = error.response?.status;
        if (statusCode === 404) {
          setError(`Receipt not found (404). Please try refreshing the page.`);
        } else {
          setError(`Failed to load receipt details. ${error.message || ''}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReceiptDetails();
  }, [userId, emailId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Fix the endpoint URL - remove 'email/' to make it work for both email and uploaded receipts
      const response = await axiosInstance.put(`/api/receipts/${userId}/${emailId}`, formData);
      
      if (response.data.success) {
        setReceipt(prev => {
          if (!prev) return null;
          return {
            ...prev,
            vendor: formData.vendor || prev.vendor,
            amount: formData.amount || prev.amount,
            currency: formData.currency || prev.currency,
            category: formData.category || prev.category,
            notes: formData.notes || prev.notes
          };
        });
        setEditMode(false);
        setMessage('Receipt updated successfully');
      } else {
        setError(response.data.message || 'Failed to update receipt');
      }
    } catch (error: any) {
      console.error('Error updating receipt:', error);
      setError('An error occurred while updating the receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      // Fix the endpoint URL - remove 'email/' to make it work for both email and uploaded receipts
      const response = await axiosInstance.post(`/api/receipts/${userId}/${emailId}/reprocess`);
      
      if (response.data.success && response.data.receipt) {
        setReceipt(response.data.receipt);
        setFormData({
          vendor: response.data.receipt.vendor || '',
          amount: response.data.receipt.amount || 0,
          currency: response.data.receipt.currency || '',
          category: response.data.receipt.category || '',
          notes: response.data.receipt.notes || ''
        });
        setMessage('Receipt reprocessed successfully');
      } else {
        setError(response.data.message || 'Failed to reprocess receipt');
      }
    } catch (error: any) {
      console.error('Error reprocessing receipt:', error);
      setError('An error occurred while reprocessing the receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg max-w-3xl w-full mx-auto p-6 shadow-xl">
          <div className="flex justify-between items-center pb-3 border-b">
            <h3 className="text-xl font-semibold text-gray-900">Receipt Details</h3>
            <button
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">{error}</div>
            ) : receipt ? (
              <div className="space-y-6">
                {(receipt.fileUrl || receipt.fileKey) && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Receipt Image</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-center">
                        <img
                          src={ensureFullS3Url(receipt.fileUrl || receipt.fileKey) || ''}
                          alt={receipt.fileName || 'Receipt Image'}
                          className="max-h-64 object-contain rounded shadow-sm"
                          onError={(e) => {
                            const imgElement = e.currentTarget;
                            if (imgElement.src !== ensureFullS3Url(receipt.fileKey || '') && receipt.fileKey) {
                              // Try the fileKey URL if fileUrl failed
                              imgElement.src = ensureFullS3Url(receipt.fileKey) || '';
                            } else {
                              // Use an inline SVG as fallback instead of external placeholder
                              imgElement.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%20viewBox%3D%220%200%20400%20300%22%20fill%3D%22none%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22150%22%20font-family%3D%22Arial%22%20font-size%3D%2216%22%20fill%3D%22%236b7280%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3EReceipt%20Image%20Not%20Available%3C%2Ftext%3E%3C%2Fsvg%3E';
                              imgElement.alt = 'Receipt image not available';
                            }
                          }}
                        />
                      </div>
                      {receipt.fileName && (
                        <p className="text-sm text-center text-gray-500 mt-2">{receipt.fileName}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Receipt Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Vendor</p>
                        <p className="text-sm text-gray-900">{receipt.vendor || 'Not detected'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Amount</p>
                        <p className="text-sm text-gray-900">
                          {receipt.amount 
                            ? `${receipt.currency || 'INR'} ${receipt.amount.toFixed(2)}` 
                            : 'Not detected'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Receipt Date</p>
                        <p className="text-sm text-gray-900">
                          {receipt.receiptDate 
                            ? new Date(receipt.receiptDate).toLocaleDateString() 
                            : 'Not detected'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Order/Receipt #</p>
                        <p className="text-sm text-gray-900">{receipt.orderNumber || 'Not detected'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Category</p>
                        <p className="text-sm text-gray-900">{receipt.category || 'Uncategorized'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <p className="text-sm text-gray-900">{receipt.notes || 'No notes'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {receipt.extractedText && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Extracted Text</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="max-h-48 overflow-y-auto text-sm text-gray-700 bg-white p-3 rounded border border-gray-200 whitespace-pre-wrap">
                        {receipt.extractedText}
                      </div>
                    </div>
                  </div>
                )}
                
                {receipt.source === 'email' && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Email Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">From</p>
                        <p className="text-sm text-gray-900">{receipt.from || 'Unknown sender'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Subject</p>
                        <p className="text-sm text-gray-900">{receipt.subject || 'No subject'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Received</p>
                        <p className="text-sm text-gray-900">
                          {receipt.receivedAt 
                            ? new Date(receipt.receivedAt).toLocaleString() 
                            : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleReprocess}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Reprocess Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit Details
                  </button>
                </div>
                
                {message && (
                  <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-md">
                    {message}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">Receipt not found</div>
            )}
          </div>
          
          {editMode && receipt && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Receipt Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vendor</label>
                    <input
                      type="text"
                      name="vendor"
                      value={formData.vendor}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Currency</label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                      <option value="Uncategorized">Uncategorized</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Travel">Travel</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>
                
                <div className="mt-5 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptDetailModal;