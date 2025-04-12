const { google } = require('googleapis');
const User = require('../models/User');
const Receipt = require('../models/Receipt');

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

/**
 * Generate Gmail auth URL with state parameter containing userId
 */
const getAuthUrl = (userId) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force to get refresh token
    state: userId
  });
};

/**
 * Exchange authorization code for tokens
 */
const getTokensFromCode = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Get an authorized Gmail client for a user
 * This handles token refresh automatically
 */
const getAuthorizedClient = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!user.gmailTokens || !user.gmailTokens.refresh_token) {
    throw new Error('Gmail not connected');
  }
  
  // Set credentials from stored tokens
  oauth2Client.setCredentials(user.gmailTokens);
  
  // Check if token needs refresh
  if (user.gmailTokens.expiry_date && user.gmailTokens.expiry_date <= Date.now()) {
    try {
      console.log('Refreshing Gmail token for user:', userId);
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update user with new tokens
      user.gmailTokens = credentials;
      user.gmailConnected = true;
      await user.save();
      
      // Update client with new credentials
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // If invalid_grant error, user needs to reconnect
      if (error.message.includes('invalid_grant')) {
        user.gmailConnected = false;
        await user.save();
        throw new Error('Gmail authorization expired. Please reconnect.');
      }
      
      throw error;
    }
  }
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
};

/**
 * Fetch receipts from Gmail with automatic token refresh
 */
const fetchReceiptsFromGmail = async (userId, options = {}) => {
  try {
    // Update sync status to indicate processing
    const user = await User.findById(userId);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    if (!user.gmailConnected || !user.gmailTokens?.refresh_token) {
      return { success: false, error: 'Gmail not connected' };
    }
    
    // Get authorized client (this handles token refresh)
    const gmail = await getAuthorizedClient(userId);
    
    // Search for receipt-like emails
    const query = 'subject:(receipt OR order OR confirmation OR invoice)';
    
    // Fetch messages that match the query
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: options.maxResults || 50
    });
    
    const messages = response.data.messages || [];
    const newReceipts = [];
    
    // Process each email that might be a receipt
    for (const message of messages) {
      try {
        // Check if we already have this receipt
        const existingReceipt = await Receipt.findOne({
          userId,
          source: 'gmail',
          'metadata.emailId': message.id
        });
        
        if (existingReceipt) {
          continue; // Skip already processed receipts
        }
        
        // Get full email data
        const emailData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        
        // Extract headers
        const headers = emailData.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Extract email body (simplified - you'll need a more robust parser)
        let body = '';
        if (emailData.data.payload.parts) {
          const textParts = emailData.data.payload.parts.filter(
            part => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          
          for (const part of textParts) {
            if (part.body.data) {
              body += Buffer.from(part.body.data, 'base64').toString('utf8');
            }
          }
        } else if (emailData.data.payload.body?.data) {
          body = Buffer.from(emailData.data.payload.body.data, 'base64').toString('utf8');
        }
        
        // Create a new receipt
        const newReceipt = new Receipt({
          userId,
          title: subject,
          date: new Date(date),
          amount: 0, // You'll need to extract this from the email
          merchant: from.split('<')[0].trim(),
          category: 'Uncategorized',
          source: 'gmail',
          metadata: {
            emailId: message.id,
            sender: from,
            subject,
            receiptDate: date,
          },
          rawText: body
        });
        
        await newReceipt.save();
        newReceipts.push(newReceipt);
      } catch (emailError) {
        console.error(`Error processing email ${message.id}:`, emailError);
        // Continue with next email
      }
    }
    
    return {
      success: true,
      count: newReceipts.length,
      message: `Found ${newReceipts.length} new receipts`,
      receipts: newReceipts
    };
  } catch (error) {
    console.error('Error fetching Gmail receipts:', error);
    
    // Special error handling for authorization issues
    if (error.message.includes('Gmail authorization expired')) {
      return {
        success: false,
        error: 'Authorization expired',
        needsReconnect: true
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  getAuthorizedClient,
  fetchReceiptsFromGmail
};
