/* eslint-disable @typescript-eslint/no-explicit-any */
// client/src/components/dashboard/components/ReceiptDetails.tsx
import React, { useState, useEffect } from 'react';

interface ReceiptDetailsProps {
  receiptId: string;
}

const ReceiptDetails: React.FC<ReceiptDetailsProps> = ({ receiptId }) => {
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceiptDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/upload/receipt-ocr/${receiptId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch receipt details');
        }
        
        const data = await response.json();
        setReceipt(data);
      } catch (error) {
        console.error('Error fetching receipt details:', error);
        setError('Failed to load receipt details');
      } finally {
        setLoading(false);
      }
    };

    if (receiptId) {
      fetchReceiptDetails();
    }
  }, [receiptId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-600">{error || 'Receipt not found'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Receipt Details</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Processing Status</p>
        <div className="mt-1 flex items-center">
          {receipt.processingStatus === 'completed' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Completed
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
      
      {receipt.extractedText && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Extracted Text</p>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{receipt.extractedText}</pre>
          </div>
        </div>
      )}
      
      {receipt.processingStatus === 'processing' && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">OCR processing is in progress...</p>
          <div className="mt-2 flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptDetails;
