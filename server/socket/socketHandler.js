const jwt = require('jsonwebtoken');
const { Document, Version, User } = require('../models');
const Delta = require('quill-delta');
const { transform } = require('../utils/otTransform');

// In-memory state management
const documentSessions = new Map();
const documentPresence = new Map();
const saveTimers = new Map();

const USER_COLORS = [
  '#E24B4A', '#639922', '#185FA5', '#BA7517',
  '#534AB7', '#D85A30', '#0891B2', '#7C3AED',
];

class DocumentSession {
  constructor(documentId) {
    this.documentId = documentId;
    this.content = new Delta();
    this.revision = 0;
    this.opsLog = [];
    this.clients = new Map();
  }

  applyDelta(delta) {
    const incoming = new Delta(delta);
    this.content = this.content.compose(incoming);
    this.revision++;
    this.opsLog.push(delta);
    if (this.opsLog.length > 100) {
      this.opsLog = this.opsLog.slice(-100);
    }
    return incoming;
  }
}

function getSession(documentId) {
  if (!documentSessions.has(documentId)) {
    documentSessions.set(documentId, new DocumentSession(documentId));
  }
  return documentSessions.get(documentId);
}

function getUserColor(userId) {
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function debounceSave(session, io) {
  if (saveTimers.has(session.documentId)) {
    clearTimeout(saveTimers.get(session.documentId));
  }

  const timer = setTimeout(async () => {
    try {
      const doc = await Document.findById(session.documentId);
      if (doc) {
        doc.content = session.content.ops;
        doc.revision = session.revision;
        doc.updatedAt = new Date();
        await doc.save();

        const firstClient = session.clients.values().next().value;
        const savedBy = firstClient ? firstClient.userId : null;

        const version = new Version({
          documentId: session.documentId,
          content: session.content.ops,
          revision: session.revision,
          label: 'Auto-save',
          savedBy,
        });
        await version.save();

        console.log(`💾 Document ${session.documentId} saved at revision ${session.revision}`);

        io.of('/documents').to(session.documentId).emit('save-status', {
          status: 'saved',
          revision: session.revision,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      io.of('/documents').to(session.documentId).emit('save-status', {
        status: 'error',
        message: 'Failed to save',
      });
    } finally {
      saveTimers.delete(session.documentId);
    }
  }, 2000);

  saveTimers.set(session.documentId, timer);
}

async function userHasAccessToDocument(userId, documentId) {
  try {
    const doc = await Document.findById(documentId);
    if (!doc) return false;

    if (doc.ownerId.toString() === userId.toString()) {
      return true;
    }

    return doc.collaborators.some(
      c => c.userId.toString() === userId.toString()
    );
  } catch (error) {
    console.error('Access check error:', error);
    return false;
  }
}

module.exports = (io) => {
  const namespace = io.of('/documents');

  namespace.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join-document', async ({ documentId, token }) => {
      try {
        if (!token || !process.env.JWT_SECRET) {
          return socket.emit('error', { message: 'Missing authentication' });
        }

        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
          return socket.emit('error', { message: 'Invalid token' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
          return socket.emit('error', { message: 'User not found' });
        }

        const doc = await Document.findById(documentId)
          .populate('ownerId', 'name email')
          .populate('collaborators.userId', 'name email');

        if (!doc) {
          return socket.emit('error', { message: 'Document not found' });
        }

        const hasAccess = await userHasAccessToDocument(user._id, documentId);
        if (!hasAccess) {
          console.warn(`⚠️  Unauthorized: ${user.email} to doc ${documentId}`);
          return socket.emit('error', { message: 'Access denied' });
        }

        let role = 'viewer';
        if (doc.ownerId._id.toString() === user._id.toString()) {
          role = 'editor';
        } else {
          const collab = doc.collaborators.find(
            c => c.userId._id.toString() === user._id.toString()
          );
          role = collab?.role || 'viewer';
        }

        socket.join(documentId);
        socket.data = {
          userId: user._id.toString(),
          userName: user.name,
          documentId,
          role,
        };

        const session = getSession(documentId);

        if (session.clients.size === 0) {
          session.content = new Delta(doc.content || []);
          session.revision = doc.revision || 0;
        }

        const userColor = getUserColor(user._id.toString());
        session.clients.set(socket.id, {
          userId: user._id.toString(),
          name: user.name,
          color: userColor,
        });

        if (!documentPresence.has(documentId)) {
          documentPresence.set(documentId, new Map());
        }
        documentPresence.get(documentId).set(user._id.toString(), {
          name: user.name,
          color: userColor,
          range: null,
        });

        socket.emit('load-document', {
          content: session.content.ops,
          revision: session.revision,
          collaborators: doc.collaborators.map(c => ({
            userId: c.userId._id.toString(),
            name: c.userId.name,
            role: c.role,
          })),
          owner: {
            userId: doc.ownerId._id.toString(),
            name: doc.ownerId.name,
          },
          yourRole: role,
        });

        const presenceUsers = Array.from(documentPresence.get(documentId)).map(
          ([userId, data]) => ({
            userId,
            name: data.name,
            color: data.color,
            range: data.range,
          })
        );

        namespace.to(documentId).emit('presence-update', {
          users: presenceUsers,
        });

        console.log(`👤 ${user.name} joined document ${documentId} (role: ${role})`);
      } catch (error) {
        console.error('Join error:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    socket.on('send-delta', ({ documentId, delta, clientRevision }) => {
      try {
        if (!socket.data) {
          return socket.emit('error', { message: 'Not in a document' });
        }

        if (socket.data.role === 'viewer') {
          return socket.emit('error', { message: 'Viewers cannot edit' });
        }

        const session = getSession(documentId);
        const serverRevision = session.revision;

        let transformedDelta = new Delta(delta);

        if (clientRevision < serverRevision) {
          const concurrentOps = session.opsLog.slice(clientRevision);
          for (const op of concurrentOps) {
            transformedDelta = transform(
              new Delta(op),
              transformedDelta,
              'left'
            );
          }
          console.log(
            `🔄 Transform: client=${clientRevision}, server=${serverRevision}`
          );
        }

        session.applyDelta(transformedDelta);

        socket.to(documentId).emit('receive-delta', {
          delta: transformedDelta.ops,
          revision: session.revision,
          userId: socket.data.userId,
        });

        debounceSave(session, io);
        socket.emit('save-status', { status: 'saving' });
      } catch (error) {
        console.error('Delta error:', error);
        socket.emit('error', { message: 'Failed to apply changes' });
      }
    });

    socket.on('cursor-move', ({ documentId, range }) => {
      try {
        if (!socket.data) return;

        if (documentPresence.has(documentId)) {
          const user = documentPresence.get(documentId).get(socket.data.userId);
          if (user) {
            user.range = range;
          }
        }

        const session = getSession(documentId);
        const userColor = session?.clients.get(socket.id)?.color;

        socket.to(documentId).emit('cursor-update', {
          userId: socket.data.userId,
          name: socket.data.userName,
          color: userColor,
          range,
        });
      } catch (error) {
        console.error('Cursor error:', error);
      }
    });

    socket.on('save-version', async ({ documentId, label }) => {
      try {
        if (!socket.data) return;

        const doc = await Document.findById(documentId);
        if (!doc) return;

        const session = getSession(documentId);

        const version = new Version({
          documentId,
          content: session.content.ops,
          revision: session.revision,
          label: label || 'Manual save',
          savedBy: socket.data.userId,
        });
        await version.save();

        namespace.to(documentId).emit('version-saved', {
          versionId: version._id,
          label: version.label,
          createdAt: version.createdAt,
        });

        console.log(`📌 Version saved: ${label}`);
      } catch (error) {
        console.error('Version save error:', error);
      }
    });

    socket.on('disconnect', () => {
      try {
        if (!socket.data) return;

        const { documentId, userId } = socket.data;
        const session = getSession(documentId);

        if (session) {
          session.clients.delete(socket.id);
        }

        if (documentPresence.has(documentId)) {
          documentPresence.get(documentId).delete(userId);

          const presenceUsers = Array.from(
            documentPresence.get(documentId)
          ).map(([uid, data]) => ({
            userId: uid,
            name: data.name,
            color: data.color,
            range: data.range,
          }));

          namespace.to(documentId).emit('presence-update', {
            users: presenceUsers,
          });

          if (documentPresence.get(documentId).size === 0) {
            documentPresence.delete(documentId);
            documentSessions.delete(documentId);
            if (saveTimers.has(documentId)) {
              clearTimeout(saveTimers.get(documentId));
              saveTimers.delete(documentId);
            }
          }
        }

        console.log(`❌ Socket disconnected: ${socket.id}`);
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });
};