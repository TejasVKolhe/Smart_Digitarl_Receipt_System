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
      
      // Save tokens to user
      user.gmailTokens = tokens;
      user.gmailConnected = true;
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
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing user ID', 
        message: 'User ID is required' 
      });
    }
    
    // Use the service to fetch receipts (with automatic token refresh)
    const result = await gmailService.fetchReceiptsFromGmail(userId);
    
    // Return the result
    res.json(result);
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
    
    // Check if the user has valid Gmail tokens
    const hasValidTokens = user.gmailConnected && user.gmailTokens?.refresh_token;
    
    res.json({ 
      connected: hasValidTokens,
      lastSync: user.gmailLastSync
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
    
    // Remove Gmail tokens and reset connection status
    user.gmailTokens = undefined;
    user.googleRefreshToken = undefined;
    user.gmailConnected = false;
    await user.save();
    
    res.json({ success: true, message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

module.exports = router;
