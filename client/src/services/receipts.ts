import axios from 'axios';

// Fetch all receipts for a user
export const fetchAllReceipts = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await axios.get(`/api/receipts/all/${userId}`);
    return response.data.receipts;
  } catch (error) {
    console.error('Error fetching receipts:', error);
    throw error;
  }
};

// Fetch receipts by source
export const fetchReceiptsBySource = async (userId: string, source: string) => {
  try {
    if (!userId || !source) {
      throw new Error('User ID and source are required');
    }
    
    const response = await axios.get(`/api/receipts/source/${userId}/${source}`);
    return response.data.receipts;
  } catch (error) {
    console.error(`Error fetching ${source} receipts:`, error);
    throw error;
  }
};

// Fetch Gmail receipts
export const fetchGmailReceipts = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await axios.get(`/api/receipts/fetch/${userId}`);
    return response.data.receipts;
  } catch (error) {
    console.error('Error fetching receipts from Gmail:', error);
    throw error;
  }
};

// Check Gmail connection status
export const checkGmailConnection = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await axios.get(`/api/gmail/status/${userId}`);
    return response.data.connected;
  } catch (error) {
    console.error('Error checking Gmail connection:', error);
    return false;
  }
};

// Get Gmail authentication URL
export const getGmailAuthUrl = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await axios.get(`/api/gmail/auth?userId=${userId}`);
    return response.data.authUrl;
  } catch (error) {
    console.error('Failed to get Gmail auth URL:', error);
    throw error;
  }
};

// Save Gmail tokens after authorization
export const saveGmailTokens = async (userId: string, authCode: string) => {
  try {
    if (!userId || !authCode) {
      throw new Error('User ID and authorization code are required');
    }
    
    const response = await axios.post('/api/gmail/save-tokens', {
      userId,
      authCode
    });
    
    return response.data;
  } catch (error) {
    console.error('Error saving Gmail tokens:', error);
    throw error;
  }
};

// Disconnect Gmail
export const disconnectGmail = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await axios.post(`/api/gmail/disconnect/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    throw error;
  }
};

// Get receipt details
export const getReceiptDetails = async (receiptId: string) => {
  try {
    if (!receiptId) {
      throw new Error('Receipt ID is required');
    }
    
    const response = await axios.get(`/api/receipts/${receiptId}`);
    return response.data.receipt;
  } catch (error) {
    console.error('Error fetching receipt details:', error);
    throw error;
  }
};