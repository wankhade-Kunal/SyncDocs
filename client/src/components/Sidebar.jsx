import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../api';
import { ChevronLeft, FileText } from 'lucide-react';
import './Sidebar.css';

export const Sidebar = ({ onClose, currentDocId }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.getAll();
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Documents</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="sidebar-content">
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : (
          <nav className="document-list">
            {documents.map((doc) => (
              <button
                key={doc._id}
                className={`document-item ${doc._id === currentDocId ? 'active' : ''}`}
                onClick={() => navigate(`/documents/${doc._id}`)}
                title={doc.title}
              >
                <FileText size={16} />
                <span className="doc-title">{doc.title}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
};
