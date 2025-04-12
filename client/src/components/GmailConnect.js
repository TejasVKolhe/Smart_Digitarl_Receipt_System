import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Alert, Spinner } from 'react-bootstrap';

const GmailConnect = ({ userId, onEmailsFetched }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  
  // Check connection status on mount
  useEffect(() => {
    if (userId) {
      checkConnectionStatus();
    }
  }, [userId]);
  
  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/upload/gmail-status/${userId}`);
      setIsConnected(response.data.connected);
    } catch (err) {
      console.error('Failed to check Gmail connection status:', err);
      setError('Failed to check connection status');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConnectGmail = async () => {
    try {
      // In a real implementation, you would:
      // 1. Get the auth URL from your backend
      // 2. Open a popup or redirect to this URL
      // 3. Handle the OAuth callback
      
      // For now, we'll simulate this with a prompt for the auth code
      const authCode = prompt('Enter your Gmail authorization code (for demo purposes):');
      
      if (!authCode) return;
      
      setIsLoading(true);
      const response = await axios.post('/api/upload/connect-gmail', {
        userId,
        authCode,
      });
      
      if (response.data.success) {
        setIsConnected(true);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to connect Gmail:', err);
      setError('Failed to connect to Gmail');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFetchEmails = async () => {
    try {
      setIsFetching(true);
      setError(null);
      
      const response = await axios.get(`/api/receipts/fetch/${userId}`);
      onEmailsFetched(response.data.receipts);
    } catch (err) {
      console.error('Failed to fetch Gmail receipts:', err);
      
      // Handle specific error messages from the backend
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to fetch receipts from Gmail');
      }
    } finally {
      setIsFetching(false);
    }
  };
  
  if (isLoading) {
    return <Spinner animation="border" />;
  }
  
  return (
    <div className="gmail-connect-container my-3">
      {error && <Alert variant="danger">{error}</Alert>}
      
      {!isConnected ? (
        <Button 
          variant="primary" 
          onClick={handleConnectGmail}
          disabled={isLoading}
        >
          Connect to Gmail
        </Button>
      ) : (
        <div>
          <div className="d-flex align-items-center mb-2">
            <span className="badge bg-success me-2">Connected to Gmail</span>
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={checkConnectionStatus}
            >
              Refresh Status
            </Button>
          </div>
          
          <Button 
            variant="outline-primary" 
            onClick={handleFetchEmails}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Fetching Receipts...
              </>
            ) : (
              'Fetch Email Receipts'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default GmailConnect;
