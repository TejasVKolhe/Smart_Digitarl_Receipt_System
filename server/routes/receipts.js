const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const User = require('../models/User');
// Replace the gmailServices import with the new gmail module
const gmailService = require('../services/gmail');

// Fetch all receipts for a user
router.get('/all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const receipts = await Receipt.find({ userId }).sort({ createdAt: -1 });
    
    // Process receipts to ensure proper S3 URLs
    const processedReceipts = receipts.map(receipt => {
      // If fileUrl exists but doesn't have the full S3 path, fix it
      if (receipt.fileUrl && !receipt.fileUrl.includes('amazonaws.com')) {
        // Check if it's already a full URL
        if (!receipt.fileUrl.startsWith('http')) {
          // It's just a key, convert to full URL
          const path = receipt.fileUrl.startsWith('uploads/') 
            ? receipt.fileUrl 
            : `uploads/${receipt.fileUrl}`;
            
          receipt.fileUrl = `https://digital-receipt-manager.s3.ap-south-1.amazonaws.com/${path}`;
        }
      }
      
      // Same for fileKey
      if (receipt.fileKey && !receipt.fileKey.includes('amazonaws.com')) {
        if (!receipt.fileKey.startsWith('http')) {
          const path = receipt.fileKey.startsWith('uploads/') 
            ? receipt.fileKey 
            : `uploads/${receipt.fileKey}`;
            
          receipt.fileKey = `https://digital-receipt-manager.s3.ap-south-1.amazonaws.com/${path}`;
        }
      }
      
      return receipt;
    });
    
    res.status(200).json({ receipts: processedReceipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Fetch receipts by source
router.get('/source/:userId/:source', async (req, res) => {
  try {
    const { userId, source } = req.params;
    
    if (!userId || !source) {
      return res.status(400).json({ error: 'User ID and source are required' });
    }
    
    const receipts = await Receipt.find({ 
      userId, 
      source 
    }).sort({ createdAt: -1 });
    
    res.json({ receipts });
  } catch (error) {
    console.error(`Error fetching ${req.params.source} receipts:`, error);
    res.status(500).json({ error: `Failed to fetch ${req.params.source} receipts` });
  }
});

// Fetch Gmail receipts
router.get('/fetch/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Find user and check if they have Gmail tokens
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.gmailTokens || !user.gmailTokens.access_token) {
      return res.status(400).json({ 
        error: 'Gmail not connected', 
        message: 'Please connect your Gmail account first' 
      });
    }
    
    try {
      // Validate and refresh tokens if needed
      const validTokens = await gmailService.validateAndRefreshTokens(user.gmailTokens);
      
      // Update user tokens if they were refreshed
      if (validTokens !== user.gmailTokens) {
        user.gmailTokens = validTokens;
        await user.save();
      }
      
      // Use tokens to fetch receipts from Gmail
      const emailReceipts = await gmailService.getEmailReceipts(validTokens);
      
      // Process and save email receipts to database
      const savedReceipts = [];
      
      for (const email of emailReceipts) {
        // Check if this email is already saved as a receipt
        const existingReceipt = await Receipt.findOne({ 
          userId, 
          'emailMetadata.emailId': email.emailId 
        });
        
        if (!existingReceipt) {
          // Create new receipt from email
          const newReceipt = new Receipt({
            userId,
            fileName: email.subject || 'Email Receipt',
            processingStatus: 'completed',
            source: 'gmail',
            extractedText: email.content || '',
            isProcessed: true,
            emailMetadata: {
              emailId: email.emailId,
              sender: email.sender,
              subject: email.subject,
              receivedDate: email.receivedDate
            }
          });
          
          await newReceipt.save();
          savedReceipts.push(newReceipt);
        } else {
          savedReceipts.push(existingReceipt);
        }
      }
      
      res.json({ 
        message: `${savedReceipts.length} receipts fetched from Gmail`,
        receipts: savedReceipts
      });
    } catch (gmailError) {
      console.error('Gmail service error:', gmailError);
      
      // Check for authentication errors
      if (gmailError.message.includes('invalid tokens') || 
          gmailError.message.includes('connection failed')) {
        // Reset Gmail connection
        user.gmailConnected = false;
        await user.save();
        
        return res.status(401).json({ 
          error: 'Gmail authentication failed', 
          message: 'Please reconnect your Gmail account'
        });
      }
      
      throw gmailError; // rethrow for general error handling
    }
  } catch (error) {
    console.error('Error fetching Gmail receipts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch receipts from Gmail',
      message: error.message
    });
  }
});

// Add or update the route to get receipt details by ID
// Simplified route that can handle both email and uploaded receipts
router.get('/:userId/:receiptId', async (req, res) => {
  try {
    const { userId, receiptId } = req.params;

    if (!userId || !receiptId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Receipt ID are required'
      });
    }

    console.log(`Looking for receipt: userId=${userId}, receiptId=${receiptId}`);

    // Find the receipt without filtering by source
    const receipt = await Receipt.findOne({
      userId,
      _id: receiptId
    });

    if (!receipt) {
      console.log(`Receipt not found: userId=${userId}, receiptId=${receiptId}`);
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    console.log(`Receipt found: ${receipt.subject || receipt.fileName}`);
    
    res.json({
      success: true,
      receipt
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt details',
      error: error.message
    });
  }
});

// Add route to update receipt details
router.put('/:userId/:receiptId', async (req, res) => {
  try {
    const { userId, receiptId } = req.params;
    const updateData = req.body;
    
    // Find the receipt
    const receipt = await Receipt.findOne({
      userId,
      _id: receiptId
    });
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    // Update the fields
    if (updateData.vendor) receipt.vendor = updateData.vendor;
    if (updateData.amount) receipt.amount = updateData.amount;
    if (updateData.currency) receipt.currency = updateData.currency;
    if (updateData.category) receipt.category = updateData.category;
    if (updateData.notes !== undefined) receipt.notes = updateData.notes;
    
    await receipt.save();
    
    res.json({
      success: true,
      message: 'Receipt updated successfully',
      receipt
    });
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update receipt',
      error: error.message
    });
  }
});

// Add route to reprocess a receipt
router.post('/:userId/:receiptId/reprocess', async (req, res) => {
  try {
    const { userId, receiptId } = req.params;
    
    // Find the receipt
    const receipt = await Receipt.findOne({
      userId,
      _id: receiptId
    });
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    // Re-process text extraction if it's an uploaded receipt with extractedText
    if (receipt.extractedText) {
      const { extractVendor, extractAmounts, extractDate } = require('../services/textExtraction');
      
      // Get the existing extracted text
      const extractedText = receipt.extractedText;
      
      // Extract information from the text
      const vendor = extractVendor('', '', extractedText) || receipt.vendor;
      const { amount, currency } = extractAmounts(extractedText, '') || { amount: receipt.amount, currency: receipt.currency };
      const date = extractDate(extractedText) || receipt.receiptDate;
      
      // Update the receipt with the new information
      if (vendor) receipt.vendor = vendor;
      if (amount) receipt.amount = amount;
      if (currency) receipt.currency = currency;
      if (date) receipt.receiptDate = date;
      
      // Set category based on vendor if possible
      if (vendor && !receipt.category) {
        const vendorLower = vendor.toLowerCase();
        if (vendorLower.includes('amazon') || vendorLower.includes('flipkart') || vendorLower.includes('store')) {
          receipt.category = 'Shopping';
        } else if (vendorLower.includes('restaurant') || vendorLower.includes('food') || vendorLower.includes('swiggy') || vendorLower.includes('zomato')) {
          receipt.category = 'Food & Dining';
        } else if (vendorLower.includes('travel') || vendorLower.includes('air') || vendorLower.includes('hotel')) {
          receipt.category = 'Travel';
        }
      }
      
      await receipt.save();
    }
    
    res.json({
      success: true,
      message: 'Receipt reprocessed successfully',
      receipt
    });
  } catch (error) {
    console.error('Error reprocessing receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess receipt',
      error: error.message
    });
  }
});

module.exports = router;
