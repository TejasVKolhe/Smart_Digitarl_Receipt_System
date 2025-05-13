const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Receipt = require('../models/Receipt');
// Import the Gmail service
const gmailService = require('../services/gmail');

// Get Gmail authentication URL
router.get('/auth', async (req, res) => {
  try {
    // Check if environment variables are present
    const requiredEnvVars = [
      'GMAIL_CLIENT_ID', 
      'GMAIL_CLIENT_SECRET', 
      'GMAIL_REDIRECT_URI'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      return res.status(500).json({ 
        error: 'Gmail API configuration missing', 
        message: 'Gmail integration is not properly configured. Please contact the administrator.'
      });
    }

    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate the authentication URL
    const authUrl = gmailService.getAuthUrl(userId);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error in Gmail auth endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Gmail callback route (where Google redirects after auth)
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;
    
    console.log('Gmail callback received:', { code: !!code, state });
    
    if (!code || !userId) {
      console.error('Missing code or userId in Gmail callback', { code: !!code, userId });
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=error&message=Missing+authorization+code+or+user+ID`);
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=error&message=User+not+found`);
    }
    
    try {
      // Exchange the auth code for tokens
      const tokens = await gmailService.getTokensFromCode(code);
      
      // Save tokens to user using the correct schema structure
      // Initialize gmailConnection if it doesn't exist
      if (!user.gmailConnection) {
        user.gmailConnection = {};
      }
      
      user.gmailConnection.tokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date
      };
      user.gmailConnection.connected = true;
      user.gmailConnection.lastSyncDate = new Date();
      user.gmailConnection.syncStatus = 'idle';
      
      await user.save();
      
      // Redirect back to receipts page with success
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=success`);
    } catch (tokenError) {
      console.error('Error getting tokens:', tokenError);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=error&message=Failed+to+authenticate+with+Gmail`);
    }
  } catch (error) {
    console.error('Error in Gmail callback:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=error&message=Server+error+during+authentication`);
  }
});

// Fetch receipts from Gmail
router.get('/fetch-receipts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing user ID', 
        message: 'User ID is required' 
      });
    }
    
    // Find user first to check if Gmail is connected
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found', 
        message: 'User not found' 
      });
    }
    
    // Check if Gmail is properly connected
    if (!user.gmailConnection || !user.gmailConnection.connected || !user.gmailConnection.tokens || !user.gmailConnection.tokens.refresh_token) {
      return res.json({
        success: false,
        message: 'Gmail account not connected',
        authRequired: true
      });
    }
    
    // Update sync status before starting fetch
    user.gmailConnection.syncStatus = 'syncing';
    await user.save();
    
    try {
      // Use the service to fetch receipts (with automatic token refresh)
      const result = await gmailService.fetchReceiptsFromGmail(userId, parseInt(limit));
      
      // Update user's last sync date and status
      await User.findByIdAndUpdate(userId, {
        'gmailConnection.lastSyncDate': new Date(),
        'gmailConnection.syncStatus': 'idle'
      });
      
      // Return the result
      res.json(result);
      
    } catch (fetchError) {
      // Update user sync status to failed
      await User.findByIdAndUpdate(userId, {
        'gmailConnection.syncStatus': 'failed'
      });
      
      // Check if auth error
      if (fetchError.message && (
          fetchError.message.includes('invalid_grant') || 
          fetchError.message.includes('unauthorized')
      )) {
        return res.json({
          success: false,
          message: 'Gmail authentication expired. Please reconnect your account.',
          authRequired: true
        });
      }
      
      throw fetchError; // Re-throw to be caught by outer catch
    }
    
  } catch (error) {
    console.error('Error fetching Gmail receipts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: 'Failed to fetch receipts from Gmail: ' + error.message
    });
  }
});

// Create a new endpoint for processing emails in smaller batches
router.get('/fetch-receipts-batched/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { batchSize = 10, page = 1 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing user ID', 
        message: 'User ID is required' 
      });
    }
    
    // Find user first to check if Gmail is connected
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found', 
        message: 'User not found' 
      });
    }
    
    // Check if Gmail is properly connected
    if (!user.gmailConnection || !user.gmailConnection.connected || !user.gmailConnection.tokens || !user.gmailConnection.tokens.refresh_token) {
      return res.json({
        success: false,
        message: 'Gmail account not connected',
        authRequired: true
      });
    }
    
    // Update sync status before starting fetch
    user.gmailConnection.syncStatus = 'syncing';
    await user.save();
    
    // Send initial response
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });
    
    // Start the processing in the background
    const processResult = await gmailService.fetchReceiptsFromGmailBatched(userId, parseInt(batchSize), parseInt(page));
    
    // Send the final result chunk
    res.write(JSON.stringify(processResult));
    res.end();
    
  } catch (error) {
    console.error('Error fetching Gmail receipts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: 'Failed to fetch receipts from Gmail: ' + error.message
    });
  }
});

// Check Gmail connection status
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if the user has valid Gmail tokens using the correct schema path
    const hasValidTokens = user.gmailConnection &&
                          user.gmailConnection.connected &&
                          user.gmailConnection.tokens?.refresh_token;
    
    res.json({ 
      connected: !!hasValidTokens,
      lastSync: user.gmailConnection?.lastSyncDate,
      syncStatus: user.gmailConnection?.syncStatus || 'idle'
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    res.status(500).json({ error: 'Failed to check Gmail connection status' });
  }
});

// Disconnect Gmail
router.post('/disconnect/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove Gmail tokens and reset connection status using the correct schema path
    if (user.gmailConnection) {
      user.gmailConnection.tokens = undefined;
      user.gmailConnection.connected = false;
      user.gmailConnection.syncStatus = 'idle';
      await user.save();
    }
    
    res.json({ success: true, message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

module.exports = router;
