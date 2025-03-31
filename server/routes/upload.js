// server/routes/upload.js
const express = require('express');
const AWS = require('aws-sdk');
const Receipt = require('../models/Receipt'); // Import Receipt model
const { extractTextFromImage } = require('../services/ocrServices'); // Import OCR service
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
    console.error('❌ Missing required fields:', { userId, fileName, fileUrl });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create a new receipt with pending status
    const newReceipt = new Receipt({ 
      userId, 
      fileName, 
      fileKey,
      processingStatus: 'pending'
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

// Process OCR for a receipt
async function processReceiptOCR(receiptId, fileKey) {
  try {
    // Generate presigned URL for OCR downloading
    const downloadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
      Expires: 600
    };
    const presignedUrl = await s3.getSignedUrlPromise('getObject', downloadParams);
    // Update status to processing
    await Receipt.findByIdAndUpdate(receiptId, { processingStatus: 'processing' });
    
    // Extract text from image
    const extractedText = await extractTextFromImage(presignedUrl);
    console.log('📄 Extracted text:', extractedText); // Debug log
    
    // Update receipt with extracted text
    await Receipt.findByIdAndUpdate(receiptId, {
      extractedText,
      processingStatus: 'completed'
    });
    
    console.log(`✅ OCR processing completed for receipt ${receiptId}`);
  } catch (error) {
    console.error(`❌ Error processing OCR for receipt ${receiptId}:`, error);
    
    // Update status to failed
    await Receipt.findByIdAndUpdate(receiptId, { processingStatus: 'failed' });
  }
}

// Fetch all receipts for a specific user
router.get('/receipts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📥 Fetching receipts for userId:', userId);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const receipts = await Receipt.find({ userId }).sort({ uploadedAt: -1 });
    console.log('📄 Retrieved receipts:', receipts);

    res.json(receipts);
  } catch (error) {
    console.error('❌ Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

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
