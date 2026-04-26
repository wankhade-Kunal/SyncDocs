const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['editor', 'viewer'],
    default: 'editor',
  },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Document',
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  revision: {
    type: Number,
    default: 0,
  },
  collaborators: [collaboratorSchema],
  shareToken: {
    type: String,
    default: null,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  isStarred: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
documentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Document', documentSchema);
