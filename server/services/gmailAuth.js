const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Environment variables - make sure these are set correctly
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gmail/callback';
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Directory for storing tokens
const TOKEN_DIR = path.join(__dirname, '../tokens');
if (!fs.existsSync(TOKEN_DIR)) {
  fs.mkdirSync(TOKEN_DIR);
}

/**
 * Create an OAuth2 client with the given credentials
 * @returns {google.auth.OAuth2} The OAuth2 client
 */
const createOAuth2Client = () => {
  try {
    console.log('Creating OAuth client with redirect URI:', REDIRECT_URI);
    
    // Validate required credentials
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('Missing required OAuth credentials. Check your environment variables.');
    }
    
    const oAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    
    return oAuth2Client;
  } catch (error) {
    console.error('Error creating OAuth2 client:', error);
    throw error;
  }
};

/**
 * Generate the authorization URL for Gmail
 * @param {string} userId - MongoDB user ID
 * @returns {string} Authorization URL
 */
const getAuthUrl = (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to generate auth URL');
    }
    
    console.log(`Generating auth URL for user: ${userId}`);
    
    const oAuth2Client = createOAuth2Client();
    
    // Encode user ID in state parameter
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    console.log(`State parameter (encoded): ${state}`);
    
    // Generate authorization URL
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',  // Will return a refresh token
      scope: GMAIL_SCOPES,
      prompt: 'consent',       // Force to show consent screen
      state                    // Pass encoded state
    });
    
    console.log(`Generated auth URL: ${authUrl.substring(0, 40)}...`);
    return authUrl;
  } catch (error) {
    console.error('Error generating auth URL:', error);
    throw error;
  }
};

/**
 * Handle the OAuth2 callback
 * @param {string} code - Authorization code
 * @param {string} state - State parameter (contains userId)
 * @returns {Promise<Object>} Auth client and user ID
 */
const handleCallback = async (code, state) => {
  try {
    console.log('Processing authentication callback');
    
    // Extract userId from state
    let userId;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decodedState.userId;
      console.log(`Extracted user ID from state: ${userId}`);
    } catch (parseError) {
      console.error('Failed to parse state parameter:', parseError);
      throw new Error('Invalid state parameter in callback');
    }
    
    if (!userId) {
      throw new Error('User ID not found in callback state');
    }
    
    const oAuth2Client = createOAuth2Client();
    
    // Exchange code for tokens
    console.log('Getting tokens with code...');
    const tokenResponse = await oAuth2Client.getToken(code);
    const tokens = tokenResponse.tokens;
    console.log('Successfully got tokens');
    
    // Save tokens to file (for backup)
    try {
      const userTokenPath = path.join(TOKEN_DIR, `${userId}.json`);
      fs.writeFileSync(userTokenPath, JSON.stringify(tokens));
      console.log(`Saved tokens to ${userTokenPath}`);
    } catch (fsError) {
      console.warn('Warning: Failed to save tokens to file:', fsError);
      // Continue even if file save fails
    }
    
    // Set the credentials on the OAuth2 client
    oAuth2Client.setCredentials(tokens);
    
    // Return the OAuth2 client and user ID
    return { oAuth2Client, userId, tokens };
  } catch (error) {
    console.error('Error handling auth callback:', error);
    throw error;
  }
};

/**
 * Get an authorized OAuth2 client for a user
 * @param {string} userId - MongoDB user ID
 * @returns {Promise<google.auth.OAuth2>} Authorized OAuth2 client
 */
const getAuthorizedClient = async (userId) => {
  try {
    // Check if we have stored tokens for this user
    const tokenPath = path.join(__dirname, '..', 'tokens', `${userId}.json`);
    
    if (!fs.existsSync(tokenPath)) {
      throw new Error('No Gmail authorization found for this user');
    }
    
    // Read credentials
    const credentials = JSON.parse(process.env.GMAIL_CREDENTIALS || '{}');
    if (!credentials.web) {
      throw new Error('Invalid Gmail API credentials');
    }
    
    // Create OAuth2 client
    const { client_id, client_secret, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
    // Read token
    const token = JSON.parse(fs.readFileSync(tokenPath));
    
    // Set credentials
    oAuth2Client.setCredentials(token);
    
    return oAuth2Client;
  } catch (error) {
    console.error('Error getting authorized Gmail client:', error);
    throw error;
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  getAuthorizedClient
};
