import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import './VersionHistory.css';

export const VersionHistory = ({ documentId, isOpen, onClose, onRestore }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && documentId) {
      loadVersions();
    }
  }, [isOpen, documentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/versions/${documentId}`);
      setVersions(response.data || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
      showToast('Failed to load version history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    try {
      const label = window.prompt('Enter version label (optional):') || 'Manual save';
      
      await axiosInstance.post(`/versions/${documentId}`, { label });
      
      showToast('Version saved!', 'success');
      loadVersions();
    } catch (error) {
      showToast('Failed to save version', 'error');
    }
  };

  const handleRestore = async (versionId) => {
    if (!window.confirm('Restore this version? Current changes will be replaced.')) {
      return;
    }

    setRestoring(versionId);
    try {
      await axiosInstance.post(`/versions/${documentId}/restore/${versionId}`);
      
      showToast('Version restored!', 'success');
      onRestore?.();
      loadVersions();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to restore version';
      showToast(errorMsg, 'error');
    } finally {
      setRestoring(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content version-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Version History</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="version-controls">
            <button 
              onClick={handleSaveVersion}
              className="save-version-btn"
              disabled={loading}
            >
              Save New Version
            </button>
            <button 
              onClick={loadVersions}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loading && <div className="loading">Loading versions...</div>}

          {!loading && versions.length === 0 && (
            <div className="no-versions">
              No versions saved yet. Start editing to create versions.
            </div>
          )}

          {!loading && versions.length > 0 && (
            <div className="versions-timeline">
              {versions.map((version) => (
                <div key={version._id} className="version-item">
                  <div className="version-dot"></div>
                  
                  <div className="version-content">
                    <div className="version-header">
                      <h4>{version.label}</h4>
                      <time>{new Date(version.createdAt).toLocaleString()}</time>
                    </div>
                    
                    <div className="version-meta">
                      <span className="saved-by">
                        by {version.savedBy?.name || 'Unknown'}
                      </span>
                      <span className="revision">
                        Rev: {version.revision}
                      </span>
                    </div>
                    
                    <div className="version-actions">
                      <button 
                        onClick={() => handleRestore(version._id)}
                        disabled={restoring === version._id}
                        className="restore-btn"
                      >
                        {restoring === version._id ? 'Restoring...' : 'Restore'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
