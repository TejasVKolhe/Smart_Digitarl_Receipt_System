// File: ReceiptDetailModal.tsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../api/axios';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface EmailDetail {
  id?: string;
  emailId: string;
  subject: string;
  from: string;
  receivedAt: string;
  snippet: string;
  content: string;
  attachments?: Attachment[];
  isReceipt?: boolean;
}

interface ReceiptDetailModalProps {
  userId: string;
  emailId: string | null;
  onClose: () => void;
}

const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({ userId, emailId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [emailDetails, setEmailDetails] = useState<EmailDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!emailId) return;
    
    const fetchEmailDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching email details for ID: ${emailId}`);
        const response = await axiosInstance.get(`/receipts/email/${userId}/${emailId}`);
        console.log("Email details response:", response.data);
        
        if (response.data.success) {
          setEmailDetails(response.data.email);
        } else {
          setError(response.data.message || 'Failed to fetch email details');
        }
      } catch (error: any) {
        console.error('Error fetching email details:', error);
        setError(`Error fetching email details: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmailDetails();
  }, [userId, emailId]);
  
  // Function to download attachments
  const downloadAttachment = (attachmentId: string, filename: string) => {
    // Create a download link that points to our attachment endpoint
    const downloadUrl = `${axiosInstance.defaults.baseURL}/receipts/email/${userId}/${emailId}/attachment/${attachmentId}`;
    
    // Create an anchor element and trigger download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  if (!emailId) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold truncate">
            {loading ? 'Loading receipt details...' : emailDetails?.subject || 'Receipt Details'}
          </h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal content */}
        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-md">
              {error}
            </div>
          ) : emailDetails ? (
            <div className="space-y-6">
              {/* Basic details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <h3 className="font-medium text-gray-900">{emailDetails.subject}</h3>
                  <span className="text-sm text-gray-500">
                    {new Date(emailDetails.receivedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">From: {emailDetails.from}</p>
              </div>
              
              {/* Email content */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-700 mb-2">Email Content</h4>
                <div 
                  className="prose max-w-none overflow-auto p-4 bg-gray-50 rounded-md"
                  dangerouslySetInnerHTML={{ __html: emailDetails.content }}
                />
              </div>
              
              {/* Attachments */}
              {emailDetails.attachments && emailDetails.attachments.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Attachments ({emailDetails.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {emailDetails.attachments.map(attachment => (
                      <div 
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center">
                          {/* Icon based on file type */}
                          {attachment.mimeType.startsWith('image/') ? (
                            <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : attachment.mimeType === 'application/pdf' ? (
                            <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {Math.round(attachment.size / 1024)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadAttachment(attachment.id, attachment.filename)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Preview for image attachments */}
              {emailDetails.attachments && emailDetails.attachments.some(a => a.mimeType?.startsWith('image/')) && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Image Previews</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {emailDetails.attachments
                      .filter(a => a.mimeType?.startsWith('image/'))
                      .map(attachment => (
                        <div key={`preview-${attachment.id}`} className="relative">
                          <img
                            src={`${axiosInstance.defaults.baseURL}/receipts/email/${userId}/${emailId}/attachment/${attachment.id}`}
                            alt={attachment.filename}
                            className="rounded-md object-cover w-full h-48"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                            {attachment.filename}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500">No data available</div>
          )}
        </div>
        
        {/* Modal footer */}
        <div className="bg-gray-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDetailModal;