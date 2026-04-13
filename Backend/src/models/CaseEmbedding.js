const mongoose = require('mongoose');

const { Schema } = mongoose;

const caseEmbeddingSchema = new Schema({
  caseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  embeddingVector: {
    type: [Number],
    required: true,
    validate: {
      validator: function(vector) {
        return Array.isArray(vector) && vector.length > 0 && vector.length <= 1024;
      },
      message: 'Embedding vector must contain 1 to 1024 numeric dimensions'
    }
  },
  modelVersion: {
    type: String,
    default: 'clinical-embed-v1'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CaseEmbedding', caseEmbeddingSchema);
