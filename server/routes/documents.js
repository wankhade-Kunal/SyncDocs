const express = require('express');
const jwt = require('jsonwebtoken');
const { Document, User, Version } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/documents - Get all documents for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { ownerId: req.userId },
        { 'collaborators.userId': req.userId },
      ],
    })
      .populate('ownerId', 'name email avatar')
      .populate('collaborators.userId', 'name email avatar')
      .sort({ updatedAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents - Create new document
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;

    const doc = new Document({
      title: title?.trim() || '',
      ownerId: req.userId,
      content: [],
      revision: 0,
    });

    await doc.save();
    await doc.populate('ownerId', 'name email avatar');

    res.status(201).json(doc);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// GET /api/documents/:id - Load document
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('ownerId', 'name email avatar')
      .populate('collaborators.userId', 'name email avatar');

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access: owner or collaborator
    const isOwner = doc.ownerId._id.toString() === req.userId.toString();
    const isCollaborator = doc.collaborators.some(
      (c) => c.userId._id.toString() === req.userId.toString()
    );

    if (!isOwner && !isCollaborator && !doc.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(doc);
  } catch (error) {
    console.error('Error loading document:', error);
    res.status(500).json({ error: 'Failed to load document' });
  }
});

// PATCH /api/documents/:id - Update document title
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = doc.ownerId.toString() === req.userId.toString();
    if (!isOwner) {
      return res.status(403).json({ error: 'Only owner can update title' });
    }

    if (title) doc.title = title;
    await doc.save();

    res.json(doc);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// PATCH /api/documents/:id/star - Toggle star status
router.patch('/:id/star', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = doc.ownerId.toString() === req.userId.toString();
    const isCollaborator = doc.collaborators.some(
      (c) => c.userId.toString() === req.userId.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    doc.isStarred = !doc.isStarred;
    await doc.save();

    res.json(doc);
  } catch (error) {
    console.error('Error toggling star:', error);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

// PATCH /api/documents/:id/restore - Restore from trash
router.patch('/:id/restore', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = doc.ownerId.toString() === req.userId.toString();
    if (!isOwner) {
      return res.status(403).json({ error: 'Only owner can restore' });
    }

    doc.isDeleted = false;
    await doc.save();

    res.json(doc);
  } catch (error) {
    console.error('Error restoring document:', error);
    res.status(500).json({ error: 'Failed to restore document' });
  }
});

// DELETE /api/documents/:id - Soft delete (move to trash)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = doc.ownerId.toString() === req.userId.toString();
    if (!isOwner) {
      return res.status(403).json({ error: 'Only owner can delete' });
    }

    doc.isDeleted = true;
    await doc.save();

    res.json({ message: 'Document moved to trash' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/documents/:id/invite - Invite collaborator
router.post('/:id/invite', authMiddleware, async (req, res) => {
  try {
    const { email, role } = req.body;
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can invite' });
    }

    const collaborator = await User.findOne({ email: email.toLowerCase() });
    if (!collaborator) {
      return res.status(404).json({ error: 'No account found for that email' });
    }

    const existingIndex = doc.collaborators.findIndex(
      (c) => c.userId.toString() === collaborator._id.toString()
    );

    if (existingIndex !== -1) {
      // Update role if already collaborator
      doc.collaborators[existingIndex].role = role || 'editor';
    } else {
      // Add new collaborator
      doc.collaborators.push({
        userId: collaborator._id,
        role: role || 'editor',
      });
    }

    await doc.save();
    await doc.populate('collaborators.userId', 'name email');

    res.json({
      message: 'Collaborator invited',
      collaborators: doc.collaborators,
    });
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    res.status(500).json({ error: 'Failed to invite collaborator' });
  }
});

// PATCH /api/documents/:id/collaborators/:userId - Update collaborator role
router.patch('/:id/collaborators/:userId', authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can change roles' });
    }

    const collab = doc.collaborators.find(
      (c) => c.userId.toString() === req.params.userId
    );

    if (!collab) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    collab.role = role || 'editor';
    await doc.save();

    res.json({
      message: 'Role updated',
      collaborators: doc.collaborators,
    });
  } catch (error) {
    console.error('Error updating collaborator:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// POST /api/documents/:id/link - Generate public share link
router.post('/:id/link', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can create link' });
    }

    doc.shareToken = uuidv4();
    doc.isPublic = true;
    await doc.save();

    res.json({
      shareToken: doc.shareToken,
      shareLink: `${process.env.CLIENT_URL}/document/${doc._id}?token=${doc.shareToken}`,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// POST /api/documents/:id/share-link - Create public link
router.post('/:id/share-link', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can create share links' });
    }

    doc.shareToken = uuidv4();
    doc.isPublic = true;
    await doc.save();

    const shareUrl = `${process.env.CLIENT_URL}/join/${doc.shareToken}`;

    res.json({
      shareToken: doc.shareToken,
      shareUrl,
      link: shareUrl,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// GET /api/documents/join/:token - Join via share link (NO AUTH REQUIRED)
router.get('/join/:token', async (req, res) => {
  try {
    const doc = await Document.findOne({ shareToken: req.params.token });

    if (!doc) {
      return res.status(404).json({ error: 'Invalid share link' });
    }

    if (!doc.isPublic) {
      return res.status(403).json({ error: 'Link has been disabled' });
    }

    // If user is authenticated, add as viewer if not already collaborator
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.slice(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const isOwner = doc.ownerId.toString() === decoded.userId;
        const isCollaborator = doc.collaborators.some(
          c => c.userId.toString() === decoded.userId
        );

        if (!isOwner && !isCollaborator) {
          doc.collaborators.push({
            userId: decoded.userId,
            role: 'viewer',
          });
          await doc.save();
        }
      } catch (e) {
        // Invalid token, just return doc id
      }
    }

    res.json({ documentId: doc._id });
  } catch (error) {
    console.error('Error joining document:', error);
    res.status(500).json({ error: 'Failed to join document' });
  }
});

// DELETE /api/documents/:id/collaborators/:userId - Remove collaborator
router.delete('/:id/collaborators/:userId', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can remove collaborators' });
    }

    doc.collaborators = doc.collaborators.filter(
      (c) => c.userId.toString() !== req.params.userId
    );

    await doc.save();
    res.json(doc);
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

module.exports = router;
