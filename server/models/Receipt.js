const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: { type: String, required: true },

  fileKey: {
    type: String,
    validate: {
      validator: function (v) {
        if (this.source === 'upload') return !!v;
        return true;
      },
      message: 'fileKey is required for uploaded receipts'
    }
  },

  fileUrl: String,
  uploadedAt: { type: Date, default: Date.now },

  source: {
    type: String,
    enum: ['upload', 'email', 'scan', 'manual'],
    default: 'upload'
  },

  emailId: String,
  subject: String,
  from: String,
  snippet: String,
  content: String,
  receivedAt: Date,

  emailMetadata: {
    emailId: String,
    sender: String,
    subject: String,
    receivedDate: String
  },

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
