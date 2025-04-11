// server/models/Receipt.js
const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // For uploaded receipts
  fileName: { type: String, required: true },
  fileKey: {
    type: String,
    required: function() {
      // Only require fileKey for uploaded receipts, not for email receipts
      return this.source === 'upload';
    }
  },
  fileUrl: String,
  uploadedAt: { type: Date, default: Date.now },
  // For email receipts
  source: {
    type: String,
    enum: ['upload', 'email', 'scan'],
    default: 'upload'
  },
  emailId: String,
  subject: String,
  from: String,
  snippet: String,
  content: String,
  receivedAt: Date,
  // Add email metadata for Gmail receipts
  emailMetadata: {
    emailId: String,
    sender: String,
    subject: String,
    receivedDate: String
  },
  // Common fields
  amount: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'INR'
  },
  vendor: String,
  orderNumber: String,
  receiptDate: Date,
  category: {
    type: String,
    default: 'Uncategorized'
  },
  notes: String,
  isProcessed: {
    type: Boolean,
    default: false
  },
  extractedText: { type: String, default: '' },
  processingStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  processingError: { 
    type: String, 
    default: null 
  },
  metadata: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Receipt', ReceiptSchema);
