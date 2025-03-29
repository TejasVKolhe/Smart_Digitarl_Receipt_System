/* eslint-disable @typescript-eslint/no-explicit-any */
// client/src/components/dashboard/Receipts.tsx
import React, { useState, useEffect } from 'react';
import ReceiptDetails from './components/ReceiptDetails';

const Receipts: React.FC = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!user.id) {
          console.error('User ID not found in localStorage');
          setLoading(false);
          return;
        }
        
        const response = await fetch(`http://localhost:5000/api/upload/receipts/${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch receipts');
        }
        
        const data = await response.json();
        setReceipts(data);
      } catch (error) {
        console.error('Error fetching receipts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Receipts</h2>
      
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-500">No receipts found. Upload your first receipt to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-indigo-50">
                <h3 className="font-medium text-indigo-800">Receipt List</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {receipts.map((receipt) => (
                  <div 
                    key={receipt._id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedReceipt === receipt._id ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => setSelectedReceipt(receipt._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 truncate">{receipt.fileName}</p>
                          <p className="text-xs text-gray-500">{formatDate(receipt.uploadedAt)}</p>
                        </div>
                      </div>
                      <div>
                        {receipt.processingStatus === 'completed' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Processed
                          </span>
                        )}
                        {receipt.processingStatus === 'processing' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Processing
                          </span>
                        )}
                        {receipt.processingStatus === 'failed' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Failed
                          </span>
                        )}
                        {receipt.processingStatus === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            {selectedReceipt ? (
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 bg-indigo-50">
                    <h3 className="font-medium text-indigo-800">Receipt Preview</h3>
                  </div>
                  <div className="p-4">
                    {receipts.find(r => r._id === selectedReceipt)?.fileUrl && (
                      <img 
                        src={receipts.find(r => r._id === selectedReceipt)?.fileUrl} 
                        alt="Receipt" 
                        className="w-full h-auto max-h-96 object-contain rounded-md"
                      />
                    )}
                  </div>
                </div>
                
                <ReceiptDetails receiptId={selectedReceipt} />
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <p className="text-gray-500">Select a receipt to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Receipts;
