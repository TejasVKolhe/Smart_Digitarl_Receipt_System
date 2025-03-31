/* eslint-disable @typescript-eslint/no-explicit-any */
// client/src/components/dashboard/components/UploadArea.tsx
import React, { useState } from 'react';

const UploadArea: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, setUploadedReceipt] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const checkOcrStatus = async (receiptId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/upload/receipt-ocr/${receiptId}`);
      const data = await response.json();
      
      setProcessingStatus(data.processingStatus);
      
      if (data.processingStatus === 'completed') {
        setExtractedText(data.extractedText);
        return true;
      } else if (data.processingStatus === 'failed') {
        alert('OCR processing failed. Please try again.');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking OCR status:', error);
      return false;
    }
  };

  const pollOcrStatus = async (receiptId: string) => {
    let isComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // Maximum polling attempts (30 * 2 seconds = 60 seconds max)
    
    while (!isComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
      isComplete = await checkOcrStatus(receiptId);
      attempts++;
    }
    
    if (!isComplete) {
      setProcessingStatus('timeout');
      alert('OCR processing is taking longer than expected. You can check the results later.');
    }
    
    setIsUploading(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setProcessingStatus('pending');
    setExtractedText('');
    setUploadedReceipt(null);
  
    try {
      // Step 1: Get pre-signed URL
      const response = await fetch(
        `http://localhost:5000/api/upload/presigned-url?fileName=${file.name}&fileType=${file.type}`
      );
  
      const data = await response.json();
  
      if (!data.uploadUrl || !data.fileKey) {
        alert('Failed to get upload URL');
        setIsUploading(false);
        return;
      }
  
      const { uploadUrl, fileKey } = data;
  
      console.log('🔗 Upload URL:', uploadUrl);
      console.log('📂 File URL:', fileKey);
  
      // Step 2: Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
  
      if (!uploadResponse.ok) {
        alert('Upload failed');
        setIsUploading(false);
        return;
      }
  
      // Step 3: Save receipt in MongoDB
      const user = JSON.parse(localStorage.getItem('user') || '{}');
  
      console.log('🧑‍💻 User from localStorage:', user);
      console.log('📝 Sending data:', {
        userId: user.id,
        fileName: file.name,
        fileKey,
      });
  
      const saveResponse = await fetch('http://localhost:5000/api/upload/save-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fileName: file.name,
          fileKey,
        }),
      });
      
      const saveData = await saveResponse.json();
      setUploadedReceipt(saveData.receipt);
      
      // Start polling for OCR results
      if (saveData.receipt && saveData.receipt._id) {
        pollOcrStatus(saveData.receipt._id);
      } else {
        setIsUploading(false);
      }
    } catch (error) {
      console.error('❌ Error during upload:', error);
      alert('Something went wrong, check console for details.');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-300 hover:border-indigo-400'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="text-sm text-gray-600">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
              <span>Upload a receipt</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>

      {file && (
        <div className="bg-indigo-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="ml-2 text-sm text-gray-700 truncate">{file.name}</span>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {file && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={`w-full py-2 px-4 rounded-xl text-white font-medium ${isUploading
            ? 'bg-indigo-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
            }`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {processingStatus === 'pending' ? 'Uploading...' : 
               processingStatus === 'processing' ? 'Processing OCR...' : 
               'Processing...'}
            </div>
          ) : (
            'Process Receipt'
          )}
        </button>
      )}

      {/* OCR Results Section */}
      {extractedText && (
        <div className="mt-6 bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Extracted Text</h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{extractedText}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
