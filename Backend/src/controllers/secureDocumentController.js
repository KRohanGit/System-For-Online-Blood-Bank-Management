const SecureDocument = require('../models/SecureDocument');
const DocumentVerificationAudit = require('../models/DocumentVerificationAudit');
const User = require('../models/User');
const { processEncryptedUpload, retrieveDecryptedFile } = require('../utils/fileEncryptionService');
const { maskExtractedFields } = require('../utils/dataMasking');

let tesseractEngine = null;
try {
  tesseractEngine = require('tesseract.js');
} catch (error) {
  tesseractEngine = null;
}

const REQUIRED_FIELDS = ['name', 'licenseNumber', 'hospitalName', 'date'];

const toConfidencePercent = (score) => Math.max(0, Math.min(100, Math.round(score)));

const normalizeText = (text = '') => text.replace(/\s+/g, ' ').trim();

const extractFieldByRegex = (text, patterns = []) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

const extractFieldsFromText = (rawText) => {
  const text = normalizeText(rawText);
  return {
    name: extractFieldByRegex(text, [
      /(?:name|full\s*name)\s*[:\-]\s*([a-zA-Z\s.'-]{2,80})/i
    ]),
    licenseNumber: extractFieldByRegex(text, [
      /(?:license\s*(?:number|no|#)?|reg(?:istration)?\s*(?:number|no|#)?)\s*[:\-]?\s*([A-Z0-9\/-]{4,30})/i
    ]),
    hospitalName: extractFieldByRegex(text, [
      /(?:hospital\s*name|hospital|clinic)\s*[:\-]\s*([a-zA-Z0-9\s&().,'-]{2,120})/i
    ]),
    date: extractFieldByRegex(text, [
      /(?:date|issued\s*on|valid\s*from)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/i
    ]),
    personalId: extractFieldByRegex(text, [
      /(?:id\s*(?:number|no|#)?|aadhaar|ssn|national\s*id)\s*[:\-]?\s*([A-Z0-9\-]{4,30})/i
    ])
  };
};

const validateExtractedFields = (fields, text) => {
  const missingFields = REQUIRED_FIELDS.filter((field) => !fields[field]);
  const anomalyFlags = [];

  if (fields.licenseNumber && !/^[A-Z0-9\/-]{4,30}$/i.test(fields.licenseNumber)) {
    anomalyFlags.push('license_number_format_invalid');
  }

  if (fields.date && Number.isNaN(Date.parse(fields.date.replace(/\./g, '/').replace(/-/g, '/')))) {
    anomalyFlags.push('date_format_unrecognized');
  }

  if (text.length < 20) {
    anomalyFlags.push('low_ocr_text_density');
  }

  const requiredPresent = REQUIRED_FIELDS.length - missingFields.length;
  const completenessScore = (requiredPresent / REQUIRED_FIELDS.length) * 70;
  const qualityPenalty = anomalyFlags.length * 10;
  const confidenceScore = toConfidencePercent(completenessScore + 30 - qualityPenalty);

  const validationStatus = missingFields.length === 0 && anomalyFlags.length === 0 ? 'valid' : 'suspicious';

  return {
    validationStatus,
    confidenceScore,
    missingFields,
    anomalyFlags
  };
};

const runOCR = async (decryptedBuffer, mimeType) => {
  if (!tesseractEngine) {
    return {
      text: '',
      anomalyFlags: ['ocr_engine_unavailable']
    };
  }

  if (!mimeType || !mimeType.startsWith('image/')) {
    return {
      text: '',
      anomalyFlags: ['unsupported_ocr_mime_type']
    };
  }

  try {
    const result = await tesseractEngine.recognize(decryptedBuffer, 'eng');
    return {
      text: result?.data?.text || '',
      anomalyFlags: []
    };
  } catch (error) {
    return {
      text: '',
      anomalyFlags: ['ocr_processing_failed']
    };
  }
};

const formatResponse = (document) => {
  const extractedFields = document.aiAnalysis?.extractedFields || {};
  const maskedFields = maskExtractedFields(extractedFields);
  return {
    documentId: document._id,
    ownerUserId: document.ownerUserId,
    ownerRole: document.ownerRole,
    documentType: document.documentType,
    originalName: document.originalName,
    verificationStatus: document.verificationStatus,
    extractedFields: maskedFields,
    validationStatus: document.aiAnalysis.validationStatus,
    confidenceScore: document.aiAnalysis.confidenceScore,
    missingFields: document.aiAnalysis.missingFields,
    anomalyFlags: document.aiAnalysis.anomalyFlags,
    aiSuggestion: `AI suggests: ${document.aiAnalysis.validationStatus === 'valid' ? 'Valid' : 'Suspicious'} (Confidence: ${document.aiAnalysis.confidenceScore}%)`,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
};

exports.uploadDocument = async (req, res) => {
  try {
    const { ownerUserId, ownerRole, documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Document file is required' });
    }

    if (!ownerUserId || !ownerRole || !documentType) {
      return res.status(400).json({ success: false, message: 'ownerUserId, ownerRole and documentType are required' });
    }

    if (!['doctor', 'hospital_admin'].includes(ownerRole)) {
      return res.status(400).json({ success: false, message: 'ownerRole must be doctor or hospital_admin' });
    }

    const owner = await User.findById(ownerUserId).select('role');
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    if (owner.role !== ownerRole) {
      return res.status(400).json({ success: false, message: 'ownerRole does not match user role' });
    }

    const encryptionPackage = await processEncryptedUpload(req.file.buffer, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fieldName: 'file'
    });

    const decryptedBuffer = await retrieveDecryptedFile({
      encryptedFileData: encryptionPackage.encryptedFileData,
      encryptedAESKey: encryptionPackage.encryptedAESKey,
      encryptionIV: encryptionPackage.encryptionIV
    });

    const ocrResult = await runOCR(decryptedBuffer, req.file.mimetype);
    const extractedFields = extractFieldsFromText(ocrResult.text);
    const validation = validateExtractedFields(extractedFields, ocrResult.text);

    const aiAnalysis = {
      extractedFields,
      validationStatus: validation.validationStatus,
      confidenceScore: validation.confidenceScore,
      missingFields: validation.missingFields,
      anomalyFlags: [...validation.anomalyFlags, ...ocrResult.anomalyFlags],
      processedAt: new Date()
    };

    const secureDocument = await SecureDocument.create({
      ownerUserId,
      ownerRole,
      documentType,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      encryptedFileData: encryptionPackage.encryptedFileData,
      encryptedAESKey: encryptionPackage.encryptedAESKey,
      encryptionIV: encryptionPackage.encryptionIV,
      encryptionMetadata: encryptionPackage.encryptionMetadata,
      aiAnalysis,
      verificationStatus: 'pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and processed successfully',
      data: formatResponse(secureDocument)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to upload document', error: error.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.verificationStatus = status;
    }

    const documents = await SecureDocument.find(query)
      .select('ownerUserId ownerRole documentType originalName verificationStatus aiAnalysis createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: documents.map((document) => formatResponse(document))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch documents', error: error.message });
  }
};

exports.verifyDocument = async (req, res) => {
  try {
    const { documentId, action, reason } = req.body;

    if (!documentId || !action) {
      return res.status(400).json({ success: false, message: 'documentId and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    }

    const document = await SecureDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    document.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
    document.verifiedBy = req.userId;
    document.verifiedAt = new Date();
    document.rejectionReason = action === 'reject' ? (reason || 'Rejected by admin') : null;
    await document.save();

    await DocumentVerificationAudit.create({
      adminId: req.userId,
      documentId: document._id,
      action,
      timestamp: new Date(),
      aiConfidence: document.aiAnalysis.confidenceScore,
      reason: action === 'reject' ? (reason || 'Rejected by admin') : null
    });

    return res.status(200).json({
      success: true,
      message: `Document ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: formatResponse(document)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to verify document', error: error.message });
  }
};
