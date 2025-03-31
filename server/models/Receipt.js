// server/models/Receipt.js
const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  fileKey: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  extractedText: { type: String, default: '' },
  processingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' }
});

module.exports = mongoose.model('Receipt', ReceiptSchema);
