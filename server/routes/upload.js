const express = require('express');
const AWS = require('aws-sdk');
const Receipt = require('../models/Receipt'); // Import Receipt model
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

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: uniqueFileName,
    Expires: 300, // URL expires in 5 minutes
    ContentType: fileType,
  };

  try {
    const url = await s3.getSignedUrlPromise('putObject', params);
    res.json({ url, fileUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${uniqueFileName}` });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});

// Save uploaded receipt details in MongoDB
router.post('/save-receipt', async (req, res) => {
  console.log('📩 Incoming request to /save-receipt:', req.body); // Debug log

  const { userId, fileName, fileUrl } = req.body;

  if (!userId || !fileName || !fileUrl) {
    console.error('❌ Missing required fields:', { userId, fileName, fileUrl });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const newReceipt = new Receipt({ userId, fileName, fileUrl });
    await newReceipt.save();
    console.log('✅ Receipt saved:', newReceipt); // Debug log
    res.json({ message: 'Receipt saved successfully', receipt: newReceipt });
  } catch (error) {
    console.error('❌ Error saving receipt:', error);
    res.status(500).json({ error: 'Failed to save receipt' });
  }
});


// // Fetch all receipts for a specific user
// router.get('/receipts/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     console.log('📥 Fetching receipts for userId:', userId);

//     if (!userId) {
//       return res.status(400).json({ error: 'User ID is required' });
//     }

//     const receipts = await Receipt.find({ userId }).sort({ uploadedAt: -1 });
//     console.log('📄 Retrieved receipts:', receipts);

//     res.json(receipts);
//   } catch (error) {
//     console.error('❌ Error fetching receipts:', error);
//     res.status(500).json({ error: 'Failed to fetch receipts' });
//   }
// });

module.exports = router;
