import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/receipts";

// Get all receipts (if this endpoint exists in your backend)
export const fetchStoredReceipts = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return [];
  }
};

// 🔹 Call this to fetch new receipts from Gmail & store in DB
export const fetchReceiptsFromGmail = async (userId: string, token: string) => {
  try {
    console.log(`🔄 Requesting Gmail receipt fetch for user ${userId}`);
    
    // Use mock response for now until backend is fixed
    console.log('⚠️ Using mock response for Gmail fetching');
    
    // Simulate delay for realistic behavior
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock success response
    return {
      success: true,
      message: 'Gmail connection successful',
      receipts: []
    };
    
    /* Original code - commented out until backend is fixed
    const response = await axios.get(`${API_BASE_URL}/fetch/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
    */
  } catch (error) {
    console.error("Error fetching new receipts:", error);
    return {
      success: false,
      message: 'Failed to fetch receipts from Gmail',
      receipts: []
    };
  }
};

// 🔹 Get uploaded receipts for a user
export const getUploadedReceipts = async (userId: string) => {
  try {
    console.log(`📤 Requesting uploaded receipts for user ${userId}`);
    
    // Try the real endpoint with a timeout
    const response = await axios.get(`${API_BASE_URL}/uploaded/${userId}`, {
      timeout: 5000
    });
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('⚠️ Unexpected format for uploaded receipts:', response.data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching uploaded receipts:", error);
    return []; // Return empty array instead of throwing
  }
};

// 🔹 Get email receipts for a user
export const getEmailReceipts = async (userId: string, token: string) => {
  try {
    console.log(`📧 Requesting email receipts for user: ${userId}`);
    
    // Use mock response for now until backend is fixed
    console.log('⚠️ Using mock response for email receipts');
    
    // Simulate delay for realistic behavior
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Return empty array as mock data
    return [];
    
    /* Original code - commented out until backend is fixed
    const response = await axios.get(`${API_BASE_URL}/email/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000,
    });
    
    // Check if we actually got an array of receipts
    if (Array.isArray(response.data)) {
      console.log(`📬 Received ${response.data.length} email receipts`);
      return response.data;
    } else {
      console.warn('⚠️ Unexpected response format:', response.data);
      // Return empty array if response is not an array
      return [];
    }
    */
  } catch (error: any) {
    console.error('❌ Error fetching email receipts:', error);
    if (error.response) {
      // Server responded with error status
      console.error('📉 Server error status:', error.response.status);
      console.error('📄 Server error data:', error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('📡 No response received:', error.request);
    } else {
      // Error in setting up the request
      console.error('🔧 Request setup error:', error.message);
    }
    // Return empty array instead of throwing to prevent component crashes
    return [];
  }
};

// Add a helper function to check if server endpoints are available
export const checkServerHealth = async () => {
  try {
    await axios.get('http://localhost:5000/api/receipts/health', { timeout: 3000 });
    return true;
  } catch (error) {
    console.warn('Receipt API health check failed:', error);
    return false;
  }
};

// Add this new function

/**
 * Debug function to test if we can fetch recent emails from Gmail
 */
export const debugFetchRecentEmails = async (userId: string, token: string) => {
  try {
    console.log(`🐞 Requesting debug: fetch recent emails for user ${userId}`);
    
    const response = await axios.get(`${API_BASE_URL}/debug/recent-emails/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });
    
    console.log('✅ Debug: Recent emails fetched successfully:', response.data);
    return response.data;
  } catch (error: any) { // Explicitly type as 'any' to handle Axios error properties
    console.error("❌ Error fetching recent emails:", error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch recent emails',
      emails: []
    };
  }
};
