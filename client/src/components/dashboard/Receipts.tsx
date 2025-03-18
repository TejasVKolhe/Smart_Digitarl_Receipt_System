import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';

interface Receipt {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

const ReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const user = JSON.parse(localStorage.getItem('user') || '{"id":""}'); // Ensure id is used correctly

  useEffect(() => {
    const fetchReceipts = async () => {
      console.log('🔍 Fetching receipts for user:', user.id);

      try {
        const response = await fetch(`http://localhost:5000/api/upload/receipts/${user.id}`);
        console.log('📩 API Response Status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📜 Received receipts:', data);

        if (Array.isArray(data)) {
          setReceipts(data);
        } else {
          console.error('❌ Unexpected API response format:', data);
        }
      } catch (error) {
        console.error('❌ Error fetching receipts:', error);
      }
    };

    if (user.id) {
      fetchReceipts();
    }
  }, [user.id]); // Only re-run when user.id changes

  return (
    <DashboardLayout user={user} onLogout={() => console.log('Logging out...')}>
      <div className="bg-white/90 backdrop-blur-sm shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Receipts</h1>
        <p className="text-gray-600">Your uploaded receipts:</p>

        {receipts.length === 0 ? (
          <p className="text-gray-500 mt-4">No receipts found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="bg-gray-100 p-4 rounded-lg shadow">
                <img src={receipt.fileUrl} alt={receipt.fileName} className="w-full h-40 object-cover rounded-md" />
                <p className="text-sm text-gray-700 mt-2">{receipt.fileName}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReceiptsPage;
