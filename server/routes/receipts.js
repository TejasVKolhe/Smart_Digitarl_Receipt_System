const express = require('express');
const passport = require('passport');
const { fetchReceipts, fetchRecentEmails } = require('../services/gmailService');
const Receipt = require('../models/Receipt');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const gmailService = require('../services/gmailService');

const router = express.Router();

/**
 * @route   GET /api/receipts/fetch
 * @desc    Fetch new receipts from Gmail and store in DB
 * @access  Private
 */
router.get(
  '/fetch',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const receipts = await fetchReceipts(req.user.id); // Capture the return value
      res.status(200).json({ message: 'Receipts fetched successfully', receipts });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ error: 'Failed to fetch receipts' });
    }
  }
);

/**
 * @route   GET /api/receipts/fetch/:userId
 * @desc    Get receipts for a specific user and store in DB
 * @access  Public (consider adding authentication here too)
 */
router.get('/fetch/:userId', async (req, res) => {
  try {
    await fetchReceipts(req.params.userId);
    console.log("Receipt for ID : ", req.params.userId);
    // Fetch saved receipts from MongoDB
    const receipts = await Receipt.find({ userId: req.params.userId });

    res.status(200).json(receipts);
  } catch (error) {
    console.error('❌ Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

/**
 * @route   GET /api/receipts/uploaded/:userId
 * @desc    Get all uploaded receipts for a user
 * @access  Private (should be authenticated)
 */
router.get('/uploaded/:userId', async (req, res) => {
  try {
    const receipts = await Receipt.find({ 
      userId: req.params.userId,
      fileUrl: { $exists: true } // Only get receipts with fileUrl (uploaded ones)
    }).sort({ uploadedAt: -1 });
    
    res.status(200).json(receipts);
  } catch (error) {
    console.error('❌ Error fetching uploaded receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

/**
 * @route   GET /api/receipts/email/:userId
 * @desc    Get all email-based receipts for a user from Gmail
 * @access  Private (should be authenticated)
 */
router.get('/email/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`📧 Fetching email receipts for user ID: ${userId}`);
    
    try {
      // Fetch more emails (50) so we have a better chance of finding receipts
      const emails = await gmailService.fetchRecentEmails(userId, 50);
      console.log(`📬 Found ${emails.length} total emails, filtering for receipts...`);
      
      // Define keywords and domains that indicate receipts
      const receiptKeywords = [
        'receipt', 'invoice', 'order', 'payment', 'transaction', 'purchase',
        'bill', 'statement', 'paid', 'confirmation', 'booking', 'ticket',
        // Indian specific keywords
        'tax invoice', 'gst', 'gst invoice', 'challan', 'subscription',
        'recharge', 'payment received', 'bank statement', 'credit card', 'debit card',
        'बिल', 'रसीद', 'भुगतान'  // Hindi for bill, receipt, payment
      ];
      
      const receiptDomains = [
        // International
        'amazon', 'paypal', 'stripe', 'shopify', 'uber', 'lyft', 'doordash',
        'grubhub', 'instacart', 'walmart', 'target', 'bestbuy', 'apple',
        'microsoft', 'netflix', 'hulu', 'spotify', 'airbnb', 'booking.com',
        'expedia', 'hotels.com', 'ebay', 'etsy', 'steam', 'playstation',
        
        // Indian domains
        'flipkart', 'myntra', 'swiggy', 'zomato', 'bigbasket', 'grofers',
        'makemytrip', 'irctc', 'indigo', 'spicejet', 'goibibo', 'yatra',
        'phonepe', 'paytm', 'gpay', 'googleplay', 'jio', 'airtel', 'vodafone',
        'reliancedigital', 'tataneu', 'amazepay', 'icici', 'hdfc', 'sbi',
        'axisbank', 'kotak', 'snapdeal', 'meesho', 'ola', 'rapido', 'urbancompany',
        'lenskart', 'nykaa', 'ajio', 'tatacliq', 'shopclues', 'cred',
        'dunzo', 'blinkit', 'zepto', 'jiomart', 'dmart', 'reliance', 'adani',
        'pepperfry', 'bookmyshow', 'easemytrip', 'cleartrip', '1mg', 'pharmeasy',
        'medlife', 'netmeds', 'cult.fit', 'policybazaar', 'acko', 'bajajfinserv',
        'hdfcbank', 'icicibank', 'sbicard', 'yesbank', 'pnbindia', 'federalbank',
        'bsesdelhi', 'tatapower', 'adanielectricity', 'mahadiscom', 'bescom',
        'trai', 'upstox', 'zerodha', 'groww', 'smallcase', 'kuvera'
      ];
      
      // Filter the emails to only include receipts
      const receiptEmails = emails.filter(email => {
        const subject = (email.subject || '').toLowerCase();
        const from = (email.from || '').toLowerCase();
        const snippet = (email.snippet || '').toLowerCase();
        
        // Check if any receipt keywords are in the subject or snippet
        const hasKeyword = receiptKeywords.some(keyword => 
          subject.includes(keyword.toLowerCase()) || 
          snippet.includes(keyword.toLowerCase())
        );
        
        // Check if the email is from a known receipt domain
        const isFromReceiptDomain = receiptDomains.some(domain => 
          from.includes(domain.toLowerCase())
        );
        
        return hasKeyword || isFromReceiptDomain;
      });
      
      console.log(`📊 Found ${receiptEmails.length} receipt emails out of ${emails.length} total`);
      
      // Add a property to indicate this is a receipt
      const enhancedReceipts = receiptEmails.map(email => ({
        ...email,
        isReceipt: true
      }));
      
      return res.status(200).json({
        success: true,
        message: `Found ${receiptEmails.length} receipt emails in your Gmail account`,
        receipts: enhancedReceipts
      });
    } catch (gmailError) {
      console.error('⚠️ Gmail fetch failed:', gmailError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch emails from Gmail: ' + gmailError.message
      });
    }
  } catch (error) {
    console.error('❌ Error in email receipts endpoint:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch email receipts'
    });
  }
});

/**
 * @route   GET /api/receipts/email/:userId/:emailId
 * @desc    Get full details for a specific email including attachments
 * @access  Private
 */
router.get('/email/:userId/:emailId', async (req, res) => {
  try {
    const { userId, emailId } = req.params;
    console.log(`📧 Fetching full details for email ID: ${emailId}`);
    
    try {
      // Get authorized client
      const auth = await gmailService.getAuthorizedClient(userId);
      const gmail = google.gmail({ version: 'v1', auth });
      
      // Get the full message
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      });
      
      // Extract headers
      const headers = {};
      if (messageResponse.data.payload && messageResponse.data.payload.headers) {
        messageResponse.data.payload.headers.forEach(header => {
          headers[header.name.toLowerCase()] = header.value;
        });
      }
      
      // Extract content
      let content = '';
      
      // Helper function to extract text from parts
      const extractTextFromParts = (parts) => {
        if (!parts) return '';
        
        let text = '';
        for (const part of parts) {
          if (part.mimeType === 'text/plain' && part.body && part.body.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            text += decoded;
          } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            text += decoded;
            break;  // Prefer HTML content if available
          } else if (part.parts) {
            text += extractTextFromParts(part.parts);
          }
        }
        return text;
      };
      
      // Get content from payload
      if (messageResponse.data.payload) {
        if (messageResponse.data.payload.mimeType === 'text/plain' && messageResponse.data.payload.body && messageResponse.data.payload.body.data) {
          content = Buffer.from(messageResponse.data.payload.body.data, 'base64').toString('utf-8');
        } else if (messageResponse.data.payload.mimeType === 'text/html' && messageResponse.data.payload.body && messageResponse.data.payload.body.data) {
          content = Buffer.from(messageResponse.data.payload.body.data, 'base64').toString('utf-8');
        } else if (messageResponse.data.payload.parts) {
          content = extractTextFromParts(messageResponse.data.payload.parts);
        }
      }
      
      // Extract attachments
      const attachments = [];
      
      const processPartsForAttachments = (parts) => {
        if (!parts) return;
        
        for (const part of parts) {
          if (part.filename && part.filename.length > 0 && part.body && part.body.attachmentId) {
            attachments.push({
              id: part.body.attachmentId,
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0
            });
          }
          
          if (part.parts) {
            processPartsForAttachments(part.parts);
          }
        }
      };
      
      if (messageResponse.data.payload && messageResponse.data.payload.parts) {
        processPartsForAttachments(messageResponse.data.payload.parts);
      }
      
      // Create email object
      const emailData = {
        emailId: messageResponse.data.id,
        subject: headers.subject || 'No Subject',
        from: headers.from || 'Unknown Sender',
        receivedAt: headers.date || new Date().toISOString(),
        snippet: messageResponse.data.snippet || '',
        content: content || '<p>No content available</p>',
        attachments: attachments
      };
      
      return res.status(200).json({
        success: true,
        message: 'Email details fetched successfully',
        email: emailData
      });
    } catch (error) {
      console.error(`Error fetching email details for ${emailId}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to fetch email details: ${error.message}`
      });
    }
  } catch (error) {
    console.error('❌ Error fetching email details:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch email details'
    });
  }
});

/**
 * @route   GET /api/receipts/email/:userId/:emailId/attachment/:attachmentId
 * @desc    Get a specific attachment from an email
 * @access  Private
 */
router.get('/email/:userId/:emailId/attachment/:attachmentId', async (req, res) => {
  try {
    const { userId, emailId, attachmentId } = req.params;
    console.log(`📎 Fetching attachment ${attachmentId} from email ${emailId}`);
    
    // Get authorized client
    const auth = await gmailService.getAuthorizedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Get the attachment
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: emailId,
      id: attachmentId
    });
    
    if (!attachment.data || !attachment.data.data) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    // Convert from base64url to base64
    const base64Data = attachment.data.data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Send as binary data
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Get filename and MIME type
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full'
    });
    
    let filename = 'attachment';
    let mimeType = 'application/octet-stream';
    
    const findAttachmentInfo = (parts) => {
      if (!parts) return false;
      
      for (const part of parts) {
        if (part.body && part.body.attachmentId === attachmentId) {
          filename = part.filename || 'attachment';
          mimeType = part.mimeType || 'application/octet-stream';
          return true;
        }
        
        if (part.parts && findAttachmentInfo(part.parts)) {
          return true;
        }
      }
      
      return false;
    };
    
    if (messageResponse.data.payload && messageResponse.data.payload.parts) {
      findAttachmentInfo(messageResponse.data.payload.parts);
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error('❌ Error fetching attachment:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch attachment'
    });
  }
});

/**
 * @route   GET /api/receipts/debug/recent-emails/:userId
 * @desc    Debug - fetch 5 most recent emails (any type) to verify Gmail API works
 * @access  Private
 */
router.get('/debug/recent-emails/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`🐞 Debug: Fetching recent emails for user: ${userId}`);
    
    // Check if token file exists
    const tokenPath = path.join(__dirname, '..', 'tokens', `${userId}.json`);
    
    if (!fs.existsSync(tokenPath)) {
      console.error(`🔴 Token file not found: ${tokenPath}`);
      return res.status(401).json({
        success: false,
        message: 'Gmail authentication required. Please connect your account first.',
        emails: []
      });
    }
    
    // Read token file
    const tokenContent = fs.readFileSync(tokenPath);
    const credentials = JSON.parse(tokenContent);
    
    // Create OAuth2 client
    const { client_id, client_secret, redirect_uris } = JSON.parse(process.env.GMAIL_CREDENTIALS).web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
    // Set credentials
    oAuth2Client.setCredentials(credentials);
    
    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    
    // List recent messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5 // Limit to 5 for debugging
    });
    
    if (!response.data.messages || response.data.messages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No emails found in your Gmail account',
        emails: []
      });
    }
    
    // Process emails to get details
    const emails = [];
    
    for (const message of response.data.messages) {
      try {
        // Get full message details
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        
        // Extract headers
        const headers = {};
        if (messageDetails.data.payload && messageDetails.data.payload.headers) {
          messageDetails.data.payload.headers.forEach(header => {
            headers[header.name.toLowerCase()] = header.value;
          });
        }
        
        // Add to results
        emails.push({
          id: message.id,
          snippet: messageDetails.data.snippet,
          subject: headers.subject || 'No Subject',
          from: headers.from || 'Unknown Sender',
          receivedAt: headers.date || new Date().toISOString()
        });
      } catch (err) {
        console.error(`Error processing message ${message.id}:`, err);
      }
    }
    
    console.log(`✅ Successfully fetched ${emails.length} recent emails`);
    return res.status(200).json({
      success: true,
      message: `Found ${emails.length} recent emails in your Gmail account`,
      emails
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching recent emails',
      error: error.stack
    });
  }
});

/**
 * Fetches full email content including attachments
 * @param {string} userId - User ID
 * @param {string} emailId - Email ID
 * @returns {Promise<Object>} Complete email with content and attachments
 */
async function fetchEmailDetails(userId, emailId) {
  console.log(`📧 Fetching complete details for email: ${emailId}`);
  
  try {
    // Get authorized client
    const auth = await getAuthorizedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Get the full message
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full'
    });
    
    // Extract basic content
    const emailData = extractEmailContent(messageResponse.data);
    
    // Get attachments if any
    const attachments = [];
    
    // Process parts to find attachments
    const processPartsForAttachments = (parts) => {
      if (!parts) return;
      
      for (const part of parts) {
        // Check if this part is an attachment
        if (part.filename && part.filename.length > 0 && part.body && part.body.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0
          });
        }
        
        // Process nested parts recursively
        if (part.parts) {
          processPartsForAttachments(part.parts);
        }
      }
    };
    
    // Check if message has parts
    if (messageResponse.data.payload && messageResponse.data.payload.parts) {
      processPartsForAttachments(messageResponse.data.payload.parts);
    }
    
    // Add attachments to email data
    emailData.attachments = attachments;
    
    // If there are any attachments, process them
    if (attachments.length > 0) {
      console.log(`📎 Found ${attachments.length} attachments in email`);
      
      // Add a function to get attachment data
      emailData.getAttachment = async (attachmentId) => {
        try {
          const attachment = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: emailId,
            id: attachmentId
          });
          
          // Return base64 data
          return attachment.data.data;
        } catch (error) {
          console.error(`Error fetching attachment ${attachmentId}:`, error);
          throw error;
        }
      };
    }
    
    return emailData;
  } catch (error) {
    console.error(`Error fetching email details for ${emailId}:`, error);
    throw error;
  }
}

module.exports = router;
