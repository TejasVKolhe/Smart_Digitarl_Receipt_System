const { google } = require('googleapis');
const User = require('../models/User');
const Receipt = require('../models/Receipt');

// Create OAuth2 client
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

// Generate auth URL
function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly'
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId,
    prompt: 'consent' // Always ask for consent to get refresh token
  });
}

// Get tokens from auth code
async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Refresh access token if needed
async function refreshTokensIfNeeded(user) {
  if (!user.gmailConnection?.tokens?.refresh_token) {
    throw new Error('No refresh token available');
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(user.gmailConnection.tokens);
  
  // Check if token is expired or will expire soon
  const expiryDate = user.gmailConnection.tokens.expiry_date;
  const isTokenExpired = expiryDate ? Date.now() >= expiryDate - 60000 : true;
  
  if (isTokenExpired) {
    console.log('Refreshing Gmail access token...');
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update user with new tokens while preserving refresh token if not provided
    if (!credentials.refresh_token && user.gmailConnection.tokens.refresh_token) {
      credentials.refresh_token = user.gmailConnection.tokens.refresh_token;
    }
    
    // Update user document
    await User.findByIdAndUpdate(user._id, {
      'gmailConnection.tokens': credentials
    });
    
    return credentials;
  }
  
  return user.gmailConnection.tokens;
}

// Extract text from email body
function extractTextFromBody(payload) {
  let body = '';
  
  function getBodyFromParts(parts) {
    if (!parts) return '';
    
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString();
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString();
        // Strip HTML tags for basic text extraction
        return html.replace(/<[^>]*>?/gm, ' ');
      } else if (part.parts) {
        const nestedBody = getBodyFromParts(part.parts);
        if (nestedBody) return nestedBody;
      }
    }
    return '';
  }
  
  // Try to get body from parts
  if (payload.parts) {
    body = getBodyFromParts(payload.parts);
  } 
  // Fallback to direct body
  else if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, 'base64').toString();
  }
  
  return body;
}

// Extract receipt data from email
function extractReceiptData(message, headers, body) {
  // Basic information
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const from = headers.find(h => h.name === 'From')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';
  
  // Try to extract amount using regex patterns
  const amountPatterns = [
    /total.*?(\$|₹|Rs\.?|INR)?\s*(\d+(?:[.,]\d{1,2})?)/i,
    /amount.*?(\$|₹|Rs\.?|INR)?\s*(\d+(?:[.,]\d{1,2})?)/i,
    /(\$|₹|Rs\.?|INR)\s*(\d+(?:[.,]\d{1,2})?)/i,
    /paid.*?(\$|₹|Rs\.?|INR)?\s*(\d+(?:[.,]\d{1,2})?)/i,
    /price.*?(\$|₹|Rs\.?|INR)?\s*(\d+(?:[.,]\d{1,2})?)/i,
  ];
  
  let amount = null;
  let currency = 'INR'; // Default currency
  
  for (const pattern of amountPatterns) {
    const match = body.match(pattern);
    if (match) {
      // If there's a currency symbol
      if (match[1]) {
        switch(match[1].trim()) {
          case '$': 
            currency = 'USD'; 
            break;
          case '₹':
          case 'Rs.':
          case 'Rs':
          case 'INR':
            currency = 'INR';
            break;
          // Add more currencies as needed
        }
      }
      
      amount = parseFloat(match[2].replace(',', '.'));
      break;
    }
  }
  
  // Extract vendor from email
  let vendor = '';
  if (from) {
    // Try to extract from domain
    const emailMatch = from.match(/@([^.]+)/);
    if (emailMatch) {
      vendor = emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1);
    } else {
      // Or use sender name
      vendor = from.split('<')[0].trim();
    }
  }
  
  // Extract potential order number
  const orderPatterns = [
    /order.*?#?\s*([A-Z0-9-]+)/i,
    /confirmation.*?#?\s*([A-Z0-9-]+)/i,
    /invoice.*?#?\s*([A-Z0-9-]+)/i,
    /receipt.*?#?\s*([A-Z0-9-]+)/i,
  ];
  
  let orderNumber = null;
  for (const pattern of orderPatterns) {
    const match = body.match(pattern) || subject.match(pattern);
    if (match && match[1]) {
      orderNumber = match[1];
      break;
    }
  }
  
  // Determine receipt category based on content
  let category = 'Other';
  const categoryPatterns = {
    'Food & Dining': /(food|restaurant|order|meal|breakfast|lunch|dinner|café|cafe|pizza|burger|sandwich)/i,
    'Shopping': /(amazon|walmart|target|ebay|shop|store|purchase|buy|order|item)/i,
    'Travel': /(travel|flight|airline|hotel|booking|reservation|airbnb|trip|taxi|uber|lyft)/i,
    'Entertainment': /(movie|cinema|theater|entertainment|ticket|show|concert|event|netflix|spotify|subscription)/i,
    'Utilities': /(utility|bill|electricity|water|gas|internet|phone|mobile|broadband)/i,
    'Groceries': /(grocery|groceries|supermarket|market|food)/i,
  };
  
  for (const [cat, pattern] of Object.entries(categoryPatterns)) {
    if (pattern.test(subject) || pattern.test(body)) {
      category = cat;
      break;
    }
  }
  
  return {
    emailId: message.id,
    subject,
    from,
    date: new Date(date),
    vendor,
    amount,
    currency,
    orderNumber,
    category,
    source: 'email'
  };
}

// Fetch and process emails to find receipts
async function fetchReceiptsFromGmail(userId, limit = 50) {
  // Find user with their tokens
  const user = await User.findById(userId);
  
  if (!user || !user.gmailConnection || !user.gmailConnection.tokens) {
    return { 
      success: false, 
      message: 'Gmail not connected', 
      authRequired: true 
    };
  }
  
  // Refresh token if needed
  try {
    const tokens = await refreshTokensIfNeeded(user);
    
    // Create gmail client
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Search for emails that might be receipts
    const query = 'subject:(receipt OR order OR invoice OR purchase OR confirmation) OR from:(amazon OR flipkart OR myntra OR zomato OR swiggy OR walmart OR target)';
    
    const messageList = await gmail.users.messages.list({
      userId: 'me',
      maxResults: limit,
      q: query
    });
    
    // If no messages found
    if (!messageList.data.messages || messageList.data.messages.length === 0) {
      return {
        success: true,
        message: 'No potential receipt emails found',
        count: 0,
        receipts: []
      };
    }
    
    console.log(`Found ${messageList.data.messages.length} potential receipt emails`);
    
    // Process each message
    const receipts = [];
    const savedReceipts = [];
    
    for (const message of messageList.data.messages) {
      try {
        // Get full message
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        
        const headers = fullMessage.data.payload.headers;
        const body = extractTextFromBody(fullMessage.data.payload);
        
        // Extract receipt data
        const receiptData = extractReceiptData(fullMessage.data, headers, body);
        
        // Only process if we found an amount (likely a receipt)
        if (receiptData.amount) {
          // Check if this receipt already exists
          const existingReceipt = await Receipt.findOne({ 
            userId: userId,
            emailId: receiptData.emailId
          });
          
          if (!existingReceipt) {
            // Generate a unique filename for this email receipt
            const sanitizedSubject = receiptData.subject
              .replace(/[^a-zA-Z0-9]/g, '_')
              .substring(0, 30);
            const timestamp = new Date().getTime();
            const generatedFileName = `email_receipt_${sanitizedSubject}_${timestamp}.txt`;
            
            // Create new receipt in database
            const receipt = new Receipt({
              userId,
              ...receiptData,
              receiptDate: receiptData.date,
              content: body.substring(0, 1000), // Store truncated content
              snippet: fullMessage.data.snippet,
              fileName: generatedFileName, // Add the required fileName field
              fileType: 'text/plain', // Assuming you need this field too
              fileUrl: '' // Leave empty or set a placeholder
            });
            
            await receipt.save();
            savedReceipts.push(receipt);
          }
          
          receipts.push(receiptData);
        }
      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError);
        // Continue to the next message
      }
    }
    
    return {
      success: true,
      message: `Successfully processed ${receipts.length} receipts, saved ${savedReceipts.length} new ones`,
      count: savedReceipts.length,
      receipts: savedReceipts
    };
    
  } catch (error) {
    console.error('Error fetching Gmail receipts:', error);
    
    // Check for auth errors
    if (error.message && (
        error.message.includes('invalid_grant') || 
        error.message.includes('unauthorized')
    )) {
      // Update user connection status
      await User.findByIdAndUpdate(userId, {
        'gmailConnection.connected': false
      });
      
      return {
        success: false,
        message: 'Gmail authentication expired. Please reconnect your account.',
        authRequired: true
      };
    }
    
    throw error; // Re-throw for the route to handle
  }
}

// Add this new function for batch processing
async function fetchReceiptsFromGmailBatched(userId, batchSize = 10, page = 1) {
  // Find user with their tokens
  const user = await User.findById(userId);
  
  if (!user || !user.gmailConnection || !user.gmailConnection.tokens) {
    return { 
      success: false, 
      message: 'Gmail not connected', 
      authRequired: true 
    };
  }
  
  // Refresh token if needed
  try {
    const tokens = await refreshTokensIfNeeded(user);
    
    // Create gmail client
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Search for emails that might be receipts
    const query = 'subject:(receipt OR order OR invoice OR purchase OR confirmation) OR from:(amazon OR flipkart OR myntra OR zomato OR swiggy OR walmart OR target)';
    
    // Calculate skip based on page and batch size
    const skip = (page - 1) * batchSize;
    
    // Get messages with pagination
    const messageList = await gmail.users.messages.list({
      userId: 'me',
      maxResults: batchSize,
      q: query,
      pageToken: skip > 0 ? await getPageToken(gmail, skip, query) : undefined
    });
    
    // If no messages found
    if (!messageList.data.messages || messageList.data.messages.length === 0) {
      return {
        success: true,
        message: 'No more receipt emails found',
        count: 0,
        receipts: [],
        page,
        hasMore: false
      };
    }
    
    console.log(`Processing batch ${page} with ${messageList.data.messages.length} emails`);
    
    // Process each message
    const receipts = [];
    const savedReceipts = [];
    
    for (const message of messageList.data.messages) {
      try {
        // Get full message
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        
        const headers = fullMessage.data.payload.headers;
        const body = extractTextFromBody(fullMessage.data.payload);
        
        // Extract receipt data
        const receiptData = extractReceiptData(fullMessage.data, headers, body);
        
        // Only process if we found an amount (likely a receipt)
        if (receiptData.amount) {
          // Check if this receipt already exists
          const existingReceipt = await Receipt.findOne({ 
            userId: userId,
            emailId: receiptData.emailId
          });
          
          if (!existingReceipt) {
            // Generate a unique filename for this email receipt
            const sanitizedSubject = receiptData.subject
              .replace(/[^a-zA-Z0-9]/g, '_')
              .substring(0, 30);
            const timestamp = new Date().getTime();
            const generatedFileName = `email_receipt_${sanitizedSubject}_${timestamp}.txt`;
            
            // Create new receipt in database
            const receipt = new Receipt({
              userId,
              ...receiptData,
              receiptDate: receiptData.date,
              content: body.substring(0, 1000), // Store truncated content
              snippet: fullMessage.data.snippet,
              fileName: generatedFileName, // Add the required fileName field
              fileType: 'text/plain', // Assuming you need this field too
              fileUrl: '' // Leave empty or set a placeholder
            });
            
            await receipt.save();
            savedReceipts.push(receipt);
          }
          
          receipts.push(receiptData);
        }
      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError);
      }
    }
    
    // Update last sync date
    await User.findByIdAndUpdate(userId, {
      'gmailConnection.lastSyncDate': new Date(),
      'gmailConnection.syncStatus': messageList.data.nextPageToken ? 'syncing' : 'idle'
    });
    
    return {
      success: true,
      message: `Successfully processed ${receipts.length} receipts in batch ${page}`,
      count: savedReceipts.length,
      receipts: savedReceipts,
      page,
      hasMore: !!messageList.data.nextPageToken,
      nextPage: messageList.data.nextPageToken ? page + 1 : null
    };
    
  } catch (error) {
    console.error('Error fetching Gmail batched receipts:', error);
    
    // Check for auth errors
    if (error.message && (
        error.message.includes('invalid_grant') || 
        error.message.includes('unauthorized')
    )) {
      // Update user connection status
      await User.findByIdAndUpdate(userId, {
        'gmailConnection.connected': false
      });
      
      return {
        success: false,
        message: 'Gmail authentication expired. Please reconnect your account.',
        authRequired: true
      };
    }
    
    throw error; // Re-throw for the route to handle
  }
}

// Helper function to get the right page token
async function getPageToken(gmail, skip, query) {
  let pageToken;
  let messagesProcessed = 0;
  
  while (messagesProcessed < skip) {
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: Math.min(100, skip - messagesProcessed),
      q: query,
      pageToken
    });
    
    if (!response.data.messages || !response.data.nextPageToken) {
      return null; // Not enough messages to reach the requested page
    }
    
    pageToken = response.data.nextPageToken;
    messagesProcessed += response.data.messages.length;
  }
  
  return pageToken;
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  fetchReceiptsFromGmail,
  fetchReceiptsFromGmailBatched
};
