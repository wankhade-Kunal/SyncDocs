import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, FolderOpen, Star, RotateCcw } from 'lucide-react';
import './DocumentCard.css';

export const DocumentCard = ({ document, onOpen, onDelete, onRestore, onStar, isTrash }) => {
  const collaboratorCount = (document?.collaborators || []).length;
  const lastModified = document?.updatedAt ? new Date(document.updatedAt) : new Date();

  // Handle card click to open document (disabled for trash items)
  const handleCardClick = () => {
    if (!isTrash && onOpen) {
      onOpen();
    }
  };

  return (
    <div 
      className={`document-card ${isTrash ? 'trash' : ''}`}
      onClick={handleCardClick}
      role={isTrash ? undefined : 'button'}
      tabIndex={isTrash ? undefined : 0}
      onKeyDown={(e) => {
        if (!isTrash && (e.key === 'Enter' || e.key === ' ')) {
          handleCardClick();
        }
      }}
    >
      <div className="card-gradient" />

      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{document?.title || 'Untitled'}</h3>
          <button
            className="card-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (isTrash && onRestore) {
                onRestore();
              } else if (!isTrash && onDelete) {
                onDelete();
              }
            }}
            title={isTrash ? 'Restore document' : 'Delete document'}
          >
            {isTrash ? <RotateCcw size={16} /> : <Trash2 size={16} />}
          </button>
        </div>

        <div className="card-meta">
          <span className="card-date">
            Updated {document?.updatedAt ? formatDistanceToNow(lastModified, { addSuffix: true }) : 'recently'}
          </span>
          {collaboratorCount > 0 && (
            <span className="card-collaborators">
              {collaboratorCount} collaborator{collaboratorCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="card-footer">
          {document?.ownerId && (
            <img
              src={document.ownerId.avatar}
              alt={document.ownerId.name}
              className="owner-avatar"
              title={document.ownerId.name}
            />
          )}
          <div className="card-actions">
            {!isTrash && (
              <button
                className={`btn btn-sm ${document?.isStarred ? 'btn-starred' : 'btn-secondary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStar) {
                    onStar();
                  }
                }}
                title={document?.isStarred ? 'Remove from starred' : 'Add to starred'}
              >
                <Star size={16} fill={document?.isStarred ? 'currentColor' : 'none'} />
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!isTrash && onOpen) {
                  onOpen();
                }
              }}
              disabled={isTrash}
              title={isTrash ? 'Cannot open deleted documents' : 'Open document'}
            >
              <FolderOpen size={16} />
              {isTrash ? 'Deleted' : 'Open'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
