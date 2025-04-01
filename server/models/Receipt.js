const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // For uploaded receipts
  fileName: String,
  fileUrl: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  // For email receipts
  source: {
    type: String,
    enum: ['upload', 'email'],
    default: 'upload'
  },
  emailId: String,
  subject: String,
  from: String,
  content: String,
  receivedAt: Date,
  // Common fields
  amount: Number,
  currency: String,
  vendor: String,
  category: String,
  isProcessed: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model('Receipt', ReceiptSchema);
