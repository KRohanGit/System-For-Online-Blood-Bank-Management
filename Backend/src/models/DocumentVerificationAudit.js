const mongoose = require('mongoose');

const documentVerificationAuditSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SecureDocument', required: true, index: true },
  action: { type: String, enum: ['approve', 'reject'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  aiConfidence: { type: Number, required: true },
  reason: { type: String, default: null }
});

module.exports = mongoose.model('DocumentVerificationAudit', documentVerificationAuditSchema);
