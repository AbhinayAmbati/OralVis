const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientIdNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  note: {
    type: String,
    trim: true
  },
  originalImageUrl: {
    type: String,
    required: true
  },
  originalImagePath: {
    type: String,
    required: true
  },
  annotatedImageUrl: {
    type: String
  },
  annotatedImagePath: {
    type: String
  },
  annotationData: {
    type: mongoose.Schema.Types.Mixed, // JSON data for annotations
    default: null
  },
  reportUrl: {
    type: String
  },
  reportPath: {
    type: String
  },
  status: {
    type: String,
    enum: ['uploaded', 'annotated', 'reported'],
    default: 'uploaded'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
submissionSchema.index({ patientId: 1, createdAt: -1 });
submissionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
