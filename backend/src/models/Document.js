import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  filename: { type: String, required: true },
  cloudinaryUrl: { type: String, default: '' },
  publicId: { type: String, default: '' },
  extractedText: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  cloudinaryUrl: {
    type: String,
    default: ''
  },
  publicId: {
    type: String,
    default: ''
  },
  extractedText: {
    type: String,
    default: ''
  },
  wordCount: {
    type: Number,
    default: 0
  },
  pageCount: {
    type: Number,
    default: 1
  },
  estimatedReadTime: {
    type: Number,
    default: 1
  },
  mimeType: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    default: 'Uncategorized'
  },
  versions: [versionSchema],
  annotations: [{
    text: String,
    color: { type: String, default: 'yellow' },
    createdAt: { type: Date, default: Date.now }
  }],
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  isShared: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

documentSchema.index({ extractedText: 'text', originalName: 'text', tags: 'text' });
documentSchema.index({ user: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);
export default Document;
