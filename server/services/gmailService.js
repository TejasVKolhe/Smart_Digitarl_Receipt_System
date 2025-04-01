const { google } = require('googleapis');
const Receipt = require('../models/Receipt');
const User = require('../models/User');
const { getAuthorizedClient } = require('./gmailAuth');

/**
 * Extracts email content from Gmail API response
 * @param {Object} message - Gmail API message object
 * @returns {Object} Extracted email data
 */
function extractEmailContent(message) {
  try {
    // Extract headers
    const headers = {};
    if (message.payload && message.payload.headers) {
      message.payload.headers.forEach(header => {
        headers[header.name.toLowerCase()] = header.value;
      });
    }
    
    // Extract body
    let content = '';
    
    // Helper function to extract text from parts
    const extractTextFromParts = (parts) => {
      if (!parts) return '';
      
      let text = '';
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          text += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          text += extractTextFromParts(part.parts);
        }
      }
      return text;
    };
    
    // Get content from payload
    if (message.payload) {
      if (message.payload.body && message.payload.body.data) {
        content = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      } else if (message.payload.parts) {
        content = extractTextFromParts(message.payload.parts);
      }
    }
    
    return {
      emailId: message.id,
      subject: headers.subject || 'No Subject',
      from: headers.from || 'Unknown',
      receivedAt: headers.date ? new Date(headers.date) : new Date(),
      content: content || message.snippet || ''
    };
  } catch (error) {
    console.error('Error extracting email content:', error);
    return {
      emailId: message.id || 'unknown',
      subject: 'Error extracting content',
      from: 'Unknown',
      receivedAt: new Date(),
      content: message.snippet || 'Error extracting content'
    };
  }
}

/**
 * Fetch receipt emails from Gmail
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Receipts found in Gmail
 */
async function fetchReceipts(userId) {
  console.log(`📧 Starting Gmail receipt fetch for user ${userId}`);
  
  try {
    // Get an authorized Gmail client
    const auth = await getAuthorizedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });
    
    console.log('🔍 Searching for receipt emails in Gmail...');
    
    // First just get recent emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10 // Get up to 10 recent emails
    });
    
    // No messages found
    if (!response.data.messages || response.data.messages.length === 0) {
      console.log('📭 No emails found');
      return [];
    }
    
    console.log(`📬 Found ${response.data.messages.length} emails to process`);
    
    // Process each message
    const emails = [];
    
    for (const messageInfo of response.data.messages) {
      try {
        // Get complete message details
        console.log(`Fetching email: ${messageInfo.id}`);
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageInfo.id,
          format: 'full'
        });
        
        // Extract headers
        const headers = {};
        if (messageResponse.data.payload && messageResponse.data.payload.headers) {
          messageResponse.data.payload.headers.forEach(header => {
            headers[header.name.toLowerCase()] = header.value;
          });
        }
        
        // Add basic email info to results
        emails.push({
          emailId: messageInfo.id,
          subject: headers.subject || 'No Subject',
          from: headers.from || 'Unknown Sender',
          receivedAt: headers.date || new Date().toISOString(),
          snippet: messageResponse.data.snippet || 'No snippet available'
        });
        
        console.log(`✓ Processed email: ${headers.subject || 'No subject'}`);
      } catch (messageError) {
        console.error(`Error processing message ${messageInfo.id}:`, messageError);
      }
    }
    
    console.log(`✅ Successfully processed ${emails.length} receipts from emails`);
    return emails;
  } catch (error) {
    console.error('Error fetching Gmail receipts:', error);
    throw error;
  }
}

/**
 * Debug function to fetch recent emails of any type
 * @param {string} userId - User ID
 * @param {number} count - Number of emails to fetch (default: 5)
 * @returns {Promise<Array>} Recent emails 
 */
async function fetchRecentEmails(userId, count = 5) {
  console.log(`📧 Debug: Fetching ${count} recent emails for user ${userId}`);
  
  try {
    // Get an authorized Gmail client
    const auth = await getAuthorizedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });
    
    console.log('🔍 Listing recent emails from inbox...');
    
    // List messages without any query (default is inbox)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: count
    });
    
    // No messages found
    if (!response.data.messages || response.data.messages.length === 0) {
      console.log('📭 No emails found');
      return [];
    }
    
    console.log(`📬 Found ${response.data.messages.length} recent emails`);
    
    // Process each message (but don't save to DB, just return info)
    const emails = [];
    
    for (const messageInfo of response.data.messages) {
      try {
        // Get complete message details
        console.log(`Fetching email: ${messageInfo.id}`);
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageInfo.id,
          format: 'full'
        });
        
        // Extract basic email content
        const emailData = extractEmailContent(messageResponse.data);
        
        // Add to results
        emails.push({
          id: emailData.emailId,
          subject: emailData.subject,
          from: emailData.from,
          receivedAt: emailData.receivedAt,
          snippet: messageResponse.data.snippet || 'No snippet available'
        });
        
        console.log(`✓ Processed email: ${emailData.subject || 'No subject'}`);
      } catch (messageError) {
        console.error(`Error processing message ${messageInfo.id}:`, messageError);
      }
    }
    
    console.log(`✅ Successfully fetched ${emails.length} recent emails`);
    return emails;
  } catch (error) {
    console.error('Error fetching recent emails:', error);
    throw error;
  }
}

module.exports = {
  fetchReceipts,
  fetchRecentEmails,
  // fetchEmailDetails,
  getAuthorizedClient
};
