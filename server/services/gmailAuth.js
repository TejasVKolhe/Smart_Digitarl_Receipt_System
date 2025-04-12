const { google } = require('googleapis');
const User = require('../models/User');
require('dotenv').config();

// Gmail API OAuth client configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

/**
 * Get an authorized Gmail API client for a specific user
 * @param {string} userId - The user ID to get authorized client for
 * @returns {Promise<OAuth2Client>} The authorized OAuth2 client
 */
async function getAuthorizedClient(userId) {
  try {
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // For development purposes - create a mock client when env vars are missing
    const missingEnvVars = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REDIRECT_URI']
      .filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.warn(`Missing Gmail environment variables: ${missingEnvVars.join(', ')}`);
      console.warn('Using mock Gmail client for development');
      
      // Return a mock client that simulates successful auth
      return {
        isMock: true,
        getRequestHeaders: () => ({ Authorization: 'Bearer mock_token' }),
        // Add other methods used by the Gmail API as needed
      };
    }
    
    // Check if user has Google tokens
    if (!user.googleRefreshToken && !user.gmailTokens) {
      throw new Error('User has not connected Gmail');
    }
    
    // Use either the googleRefreshToken field or the gmailTokens object
    if (user.gmailTokens && user.gmailTokens.refresh_token) {
      // Use the tokens object
      oauth2Client.setCredentials(user.gmailTokens);
      
      // Check if token is expired and needs refresh
      if (user.gmailTokens.expiry_date && user.gmailTokens.expiry_date <= Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        user.gmailTokens = credentials;
        await user.save();
        oauth2Client.setCredentials(credentials);
      }
    } else if (user.googleRefreshToken) {
      // Use the refresh token directly
      oauth2Client.setCredentials({
        refresh_token: user.googleRefreshToken
      });
      
      // Refresh the token to get a valid access token
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
    }
    
    return oauth2Client;
  } catch (error) {
    console.error(`Error getting authorized Gmail client: ${error.message}`);
    throw error;
  }
}

// Generate a URL for Gmail authorization
function getAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force to get refresh token
  });
}

// Exchange authorization code for tokens
async function getTokensFromCode(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw new Error('Failed to authenticate with Gmail');
  }
}

module.exports = {
  getAuthorizedClient,
  getAuthUrl,
  getTokensFromCode
};
