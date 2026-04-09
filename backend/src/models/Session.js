import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  device: {
    type: String,
    default: 'Unknown device'
  },
  browser: {
    type: String,
    default: 'Unknown browser'
  },
  os: {
    type: String,
    default: 'Unknown OS'
  },
  ip: {
    type: String,
    default: 'Unknown IP'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isCurrent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

sessionSchema.index({ userId: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
