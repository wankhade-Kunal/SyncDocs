const express = require('express');
const { Document, Version, User } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Helper: check if user has access to document
async function checkDocumentAccess(userId, documentId) {
  const doc = await Document.findById(documentId);
  if (!doc) return false;

  if (doc.ownerId.toString() === userId.toString()) {
    return true;
  }

  return doc.collaborators.some(c => c.userId.toString() === userId.toString());
}

// GET /:docId - Get all versions
router.get('/:docId', authMiddleware, async (req, res) => {
  try {
    const { docId } = req.params;

    // Check access
    const hasAccess = await checkDocumentAccess(req.userId, docId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const versions = await Version.find({ documentId: docId })
      .populate('savedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// POST /:docId - Save new version
router.post('/:docId', authMiddleware, async (req, res) => {
  try {
    const { docId } = req.params;
    const { label } = req.body;

    // Check access
    const hasAccess = await checkDocumentAccess(req.userId, docId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Load document
    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create version
    const version = new Version({
      documentId: docId,
      content: doc.content || [],
      revision: doc.revision || 0,
      savedBy: req.userId,
      label: label || 'Manual save',
    });

    await version.save();
    await version.populate('savedBy', 'name email');

    res.status(201).json(version);
  } catch (error) {
    console.error('Error saving version:', error);
    res.status(500).json({ error: 'Failed to save version' });
  }
});

// POST /:docId/restore/:vId - Restore version
router.post('/:docId/restore/:vId', authMiddleware, async (req, res) => {
  try {
    const { docId, vId } = req.params;

    // Check access and role (owner or editor)
    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = doc.ownerId.toString() === req.userId.toString();
    let role = 'viewer';
    if (isOwner) {
      role = 'editor';
    } else {
      const collab = doc.collaborators.find(
        c => c.userId.toString() === req.userId.toString()
      );
      role = collab?.role || 'viewer';
    }

    if (role === 'viewer') {
      return res.status(403).json({ error: 'Viewers cannot restore versions' });
    }

    // Load version
    const version = await Version.findById(vId);
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Update document
    doc.content = version.content;
    doc.revision = (doc.revision || 0) + 1;
    doc.updatedAt = new Date();
    await doc.save();

    // Create new version marking the restoration
    const restoredLabel = `Restored from "${version.label}" at ${new Date().toLocaleString()}`;
    const restoredVersion = new Version({
      documentId: docId,
      content: version.content,
      revision: doc.revision,
      savedBy: req.userId,
      label: restoredLabel,
    });
    await restoredVersion.save();

    res.json({
      message: 'Version restored',
      content: version.content,
      revision: doc.revision,
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

module.exports = router;

// POST /api/documents/:id/versions/restore/:vId - Restore version
router.post('/:id/versions/restore/:vId', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can restore versions' });
    }

    const version = await Version.findById(req.params.vId);

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    doc.content = version.content;
    doc.revision = version.revision;
    await doc.save();

    res.json(doc);
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

module.exports = router;
