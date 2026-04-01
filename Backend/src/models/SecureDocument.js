const mongoose = require('mongoose');

const extractedFieldsSchema = new mongoose.Schema({
  name: { type: String, default: null },
  licenseNumber: { type: String, default: null },
  hospitalName: { type: String, default: null },
  date: { type: String, default: null },
  personalId: { type: String, default: null }
}, { _id: false });

const aiAnalysisSchema = new mongoose.Schema({
  extractedFields: { type: extractedFieldsSchema, default: () => ({}) },
  validationStatus: { type: String, enum: ['valid', 'suspicious'], default: 'suspicious' },
  confidenceScore: { type: Number, default: 0 },
  missingFields: [{ type: String }],
  anomalyFlags: [{ type: String }],
  processedAt: { type: Date, default: Date.now }
}, { _id: false });

const secureDocumentSchema = new mongoose.Schema({
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerRole: { type: String, enum: ['doctor', 'hospital_admin'], required: true, index: true },
  documentType: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  encryptedFileData: { type: String, required: true },
  encryptedAESKey: { type: String, required: true },
  encryptionIV: { type: String, required: true },
  encryptionMetadata: { type: mongoose.Schema.Types.Mixed, required: true },
  aiAnalysis: { type: aiAnalysisSchema, required: true },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null }
}, { timestamps: true });

secureDocumentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SecureDocument', secureDocumentSchema);
