// server/routes/upload.js
const express = require('express');
const AWS = require('aws-sdk');
const Receipt = require('../models/Receipt'); // Import Receipt model
const { extractTextFromImage } = require('../services/ocrServices'); // Import OCR service
const gmailService = require('../services/gmail'); // Import Gmail service
require('dotenv').config();

const router = express.Router();
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Generate a pre-signed URL for uploading
router.get('/presigned-url', async (req, res) => {
  const { fileName, fileType } = req.query;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Missing fileName or fileType' });
  }

  const uniqueFileName = `uploads/${Date.now()}_${fileName}`;

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: uniqueFileName,
    Expires: 300, // URL expires in 5 minutes
    ContentType: fileType,
  };

  // Generate for OCR preprocessing downloading
  const downloadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: uniqueFileName,
    Expires: 3600
  };

  try {
    const uploadUrl = await s3.getSignedUrlPromise('putObject', uploadParams);
    const downloadUrl = await s3.getSignedUrlPromise('getObject', downloadParams);

    res.json({
      uploadUrl,
      downloadUrl,
      fileKey: uniqueFileName
    });
    
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});

// Save uploaded receipt details in MongoDB
router.post('/save-receipt', async (req, res) => {
  console.log('📩 Incoming request to /save-receipt:', req.body); // Debug log

  const { userId, fileName, fileKey } = req.body;

  if (!userId || !fileName || !fileKey) {
    console.error('❌ Missing required fields:', { userId, fileName, fileKey });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create a new receipt with pending status and explicitly set source to 'upload'
    const newReceipt = new Receipt({ 
      userId, 
      fileName, 
      fileKey,
      processingStatus: 'pending',
      source: 'upload' // Explicitly set the source type
    });
    await newReceipt.save();
    
    // Process OCR in the background
    processReceiptOCR(newReceipt._id, fileKey);
    
    console.log('✅ Receipt saved:', newReceipt); // Debug log
    res.json({ 
      message: 'Receipt saved successfully and OCR processing started', 
      receipt: newReceipt 
    });
  } catch (error) {
    console.error('❌ Error saving receipt:', error);
    res.status(500).json({ error: 'Failed to save receipt' });
  }
});

// Gmail Connection endpoints
router.post('/connect-gmail', async (req, res) => {
  const { userId, authCode } = req.body;
  
  if (!userId || !authCode) {
    return res.status(400).json({ error: 'Missing userId or authCode' });
  }

  try {
    // In a real implementation, you would exchange the authCode for tokens
    // and store them securely associated with the user
    // For now, we'll simulate this process
    
    // Update user's Gmail connection status in your database
    // This is a placeholder - you'd need a User model and update logic
    // await User.findByIdAndUpdate(userId, { gmailConnected: true, gmailTokens: tokens });
    
    res.json({ success: true, message: 'Gmail connected successfully' });
  } catch (error) {
    console.error('❌ Error connecting to Gmail:', error);
    res.status(500).json({ error: 'Failed to connect to Gmail' });
  }
});

// Fetch email receipts from Gmail
router.get('/gmail-receipts/:userId', async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // In a real implementation, you would:
    // 1. Get the stored Gmail tokens for this user
    // 2. Use them to query the Gmail API for emails
    // 3. Filter for receipts (based on sender, subject, etc.)
    // 4. Process and return the results
    
    // For now, we'll just save a sample receipt from "Gmail"
    const gmailReceipt = new Receipt({
      userId,
      fileName: 'Email Receipt',
      processingStatus: 'completed',
      source: 'gmail',
      extractedText: 'Sample email receipt content from your Gmail account',
      isProcessed: true,
      // In a real implementation, you'd have more fields like:
      // emailId, sender, subject, receivedDate, etc.
    });
    
    await gmailReceipt.save();
    
    // In a real implementation, you'd return multiple receipts
    res.json({ 
      receipts: [gmailReceipt],
      message: 'Gmail receipts fetched successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching Gmail receipts:', error);
    res.status(500).json({ error: 'Failed to fetch Gmail receipts' });
  }
});

// Check Gmail connection status
router.get('/gmail-status/:userId', async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // In a real implementation, you would check if the user has valid Gmail tokens
    // For demo purposes, let's return a mock status
    // const user = await User.findById(userId);
    // const isConnected = user && user.gmailConnected;
    
    // Mock response for now
    const isConnected = false; // Default to false, frontend will prompt connection
    
    res.json({ connected: isConnected });
  } catch (error) {
    console.error('❌ Error checking Gmail connection status:', error);
    res.status(500).json({ error: 'Failed to check Gmail connection status' });
  }
});

// Process OCR for a receipt
async function processReceiptOCR(receiptId, fileKey) {
  try {
    console.log(`Starting OCR processing for receipt ${receiptId} with fileKey ${fileKey}`);
    
    // Update status to processing
    await Receipt.findByIdAndUpdate(receiptId, { processingStatus: 'processing' });
    
    // Generate presigned URL for OCR downloading
    const downloadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
      Expires: 900, // 15 minutes to allow for long processing
    };
    
    const presignedUrl = await s3.getSignedUrlPromise('getObject', downloadParams);
    console.log(`Generated presigned download URL for OCR processing (first 100 chars): ${presignedUrl.substring(0, 100)}...`);
    
    // Extract text from image with proper error handling
    try {
      const extractedText = await extractTextFromImage(presignedUrl);
      console.log(`OCR extraction successful for receipt ${receiptId}, extracted ${extractedText.length} characters`);
      
      // Update receipt with extracted text
      await Receipt.findByIdAndUpdate(receiptId, {
        extractedText,
        processingStatus: 'completed',
        isProcessed: true
      });
      
      console.log(`✅ OCR processing completed for receipt ${receiptId}`);
    } catch (ocrError) {
      console.error(`❌ OCR extraction error for receipt ${receiptId}:`, ocrError.message);
      
      // Update status to failed with error message
      await Receipt.findByIdAndUpdate(receiptId, { 
        processingStatus: 'failed',
        processingError: ocrError.message 
      });
      
      throw ocrError; // Re-throw for overall error handling
    }
  } catch (error) {
    console.error(`❌ Error processing OCR for receipt ${receiptId}:`, error);
    
    // Update status to failed if not already done
    await Receipt.findByIdAndUpdate(receiptId, { 
      processingStatus: 'failed',
      processingError: error.message 
    });
  }
}

// New endpoint to get OCR status and results
router.get('/receipt-ocr/:receiptId', async (req, res) => {
  try {
    const { receiptId } = req.params;
    
    if (!receiptId) {
      return res.status(400).json({ error: 'Receipt ID is required' });
    }
    
    const receipt = await Receipt.findById(receiptId);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    res.json({
      processingStatus: receipt.processingStatus,
      extractedText: receipt.extractedText
    });
  } catch (error) {
    console.error('❌ Error fetching OCR status:', error);
    res.status(500).json({ error: 'Failed to fetch OCR status' });
  }
});

module.exports = router;
