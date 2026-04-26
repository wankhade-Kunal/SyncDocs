import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import './ShareModal.css';

export const ShareModal = ({ documentId, isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [collaborators, setCollaborators] = useState([]);
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && documentId) {
      loadCollaborators();
    }
  }, [isOpen, documentId]);

  const loadCollaborators = async () => {
    try {
      const response = await axiosInstance.get(`/documents/${documentId}`);
      setCollaborators(response.data.collaborators || []);
      setShareUrl(window.location.origin + `/join/${response.data.shareToken || ''}`);
    } catch (error) {
      console.error('Failed to load collaborators:', error);
      showToast('Failed to load collaborators', 'error');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter an email', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post(
        `/documents/${documentId}/invite`,
        { email: email.trim(), role }
      );
      
      setCollaborators(response.data.collaborators || []);
      setEmail('');
      showToast('Collaborator invited!', 'success');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to invite collaborator';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    try {
      const response = await axiosInstance.delete(
        `/documents/${documentId}/collaborators/${userId}`
      );
      
      setCollaborators(response.data.collaborators || []);
      showToast('Collaborator removed', 'success');
    } catch (error) {
      showToast('Failed to remove collaborator', 'error');
    }
  };

  const handleCreateLink = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `/documents/${documentId}/share-link`
      );
      
      setShareUrl(response.data.shareUrl || response.data.link);
      showToast('Share link created!', 'success');
    } catch (error) {
      showToast('Failed to create share link', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    showToast('Link copied to clipboard!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Document</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Invite Section */}
          <div className="invite-section">
            <h3>Invite Collaborators</h3>
            <form onSubmit={handleInvite} className="invite-form">
              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="submit" disabled={loading}>
                {loading ? 'Inviting...' : 'Invite'}
              </button>
            </form>
          </div>

          {/* Collaborators List */}
          {collaborators.length > 0 && (
            <div className="collaborators-section">
              <h3>Collaborators ({collaborators.length})</h3>
              <div className="collaborators-list">
                {collaborators.map(collab => (
                  <div key={collab.userId._id} className="collaborator-item">
                    <div className="collaborator-info">
                      <div className="collaborator-name">
                        {collab.userId.name}
                      </div>
                      <div className="collaborator-email">
                        {collab.userId.email}
                      </div>
                    </div>
                    <div className="collaborator-controls">
                      <select 
                        value={collab.role}
                        onChange={(e) => {
                          axiosInstance.patch(
                            `/documents/${documentId}/collaborators/${collab.userId._id}`,
                            { role: e.target.value }
                          ).then(() => loadCollaborators());
                        }}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button 
                        onClick={() => handleRemove(collab.userId._id)}
                        className="remove-btn"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link Sharing */}
          <div className="link-section">
            <h3>Share via Link</h3>
            <div className="link-controls">
              <button 
                onClick={handleCreateLink}
                disabled={loading}
                className="create-link-btn"
              >
                {loading ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
            
            {shareUrl && (
              <div className="link-display">
                <input 
                  type="text" 
                  value={shareUrl} 
                  readOnly 
                  className="link-input"
                />
                <button 
                  onClick={handleCopyLink}
                  className="copy-btn"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
