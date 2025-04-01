const express = require('express');
const router = express.Router();
const { getAuthUrl, handleCallback, getAuthorizedClient } = require('../services/gmailAuth');
const User = require('../models/User');

/**
 * @route   GET /api/gmail/auth
 * @desc    Get Gmail authorization URL
 * @access  Private
 */
router.get('/auth', async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID required',
        message: 'Please provide a userId query parameter'
      });
    }
    
    // This should now generate a URL pointing to the correct callback
    const authUrl = getAuthUrl(userId);
    console.log(`Generated auth URL for user ${userId}: ${authUrl}`);
    res.status(200).json({ authUrl });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/gmail/callback
 * @desc    Handle Gmail OAuth callback
 * @access  Public
 */
router.get('/callback', async (req, res) => {
  try {
    console.log('Gmail callback received:', req.query);
    const { code, state } = req.query;
    
    // Use the CLIENT_URL from server.js
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    if (!code || !state) {
      console.error('Missing code or state in callback');
      return res.redirect(`${frontendUrl}/dashboard/receipts?auth=error&message=Missing+required+parameters`);
    }
    
    try {
      // Process the callback
      console.log('Processing callback with code and state');
      const { userId, tokens } = await handleCallback(code, state);
      
      console.log(`Successfully authenticated user ${userId}`);
      
      // Store the refresh token in the user's document
      await User.findByIdAndUpdate(userId, {
        googleRefreshToken: tokens.refresh_token,
        googleAccessToken: tokens.access_token,
        googleTokenUpdatedAt: new Date()
      });
      
      console.log(`Stored tokens for user ${userId}, redirecting to frontend`);
      
      // Simple direct redirect
      return res.redirect(`${frontendUrl}/dashboard/receipts?auth=success&timestamp=${Date.now()}`);
    } catch (callbackError) {
      console.error('Error processing callback:', callbackError);
      return res.redirect(`${frontendUrl}/dashboard/receipts?auth=error&message=${encodeURIComponent(callbackError.message)}`);
    }
  } catch (error) {
    console.error('Unexpected error in callback route:', error);
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/dashboard/receipts?auth=error&message=Server+error`);
  }
});

/**
 * @route   GET /api/gmail/check-auth
 * @desc    Check if user is authenticated with Gmail
 * @access  Private
 */
router.get('/check-auth', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    try {
      await getAuthorizedClient(userId);
      res.status(200).json({ authenticated: true });
    } catch (error) {
      // User needs to authenticate
      const authUrl = getAuthUrl(userId);
      res.status(200).json({ authenticated: false, authUrl });
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   GET /api/gmail/auth-status
 * @desc    Check if user is authenticated with Gmail
 * @access  Private
 */
router.get('/auth-status/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find user and check for Gmail tokens
    const user = await User.findById(userId).select('googleRefreshToken googleTokenUpdatedAt');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(200).json({
      isConnected: !!user.googleRefreshToken,
      lastUpdated: user.googleTokenUpdatedAt || null
    });
  } catch (error) {
    console.error('Error checking Gmail auth status:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   GET /api/gmail/debug-config
 * @desc    Debug OAuth configuration
 * @access  Public (only in development)
 */
router.get('/debug-config', (req, res) => {
  try {
    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Debug endpoint not available in production' });
    }
    
    // Return OAuth configuration (mask the secret)
    const clientId = process.env.GOOGLE_CLIENT_ID || 'Not set';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? '****' + process.env.GOOGLE_CLIENT_SECRET.slice(-4) : 'Not set';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'Not set';
    
    res.status(200).json({
      oauth: {
        clientId,
        clientSecret,
        redirectUri
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        clientUrl: process.env.CLIENT_URL || 'Not set'
      }
    });
  } catch (error) {
    console.error('Error in debug-config route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
