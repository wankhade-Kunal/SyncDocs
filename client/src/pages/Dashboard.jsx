import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axiosInstance from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { DocumentCard } from '../components/DocumentCard';
import { SkeletonCard } from '../components/SkeletonCard';
import './Dashboard.css';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('documents'); // 'documents', 'starred', 'trash'

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosInstance.get('/documents');
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load your documents');
      showToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      const response = await axiosInstance.post('/documents', {
        title: 'Untitled Document'
      });
      navigate(`/documents/${response.data._id}`);
      showToast('Document created!', 'success');
    } catch (err) {
      console.error('Failed to create document:', err);
      showToast('Failed to create document', 'error');
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await axiosInstance.delete(`/documents/${id}`);
      setDocuments(documents.map(d => d._id === id ? { ...d, isDeleted: true } : d));
      showToast('Document moved to trash', 'success');
    } catch (err) {
      console.error('Failed to delete document:', err);
      showToast('Failed to delete document', 'error');
    }
  };

  const handleRestoreDocument = async (id) => {
    try {
      await axiosInstance.patch(`/documents/${id}/restore`);
      setDocuments(documents.map(d => d._id === id ? { ...d, isDeleted: false } : d));
      showToast('Document restored', 'success');
    } catch (err) {
      console.error('Failed to restore document:', err);
      showToast('Failed to restore document', 'error');
    }
  };

  const handleStarDocument = async (id) => {
    try {
      const response = await axiosInstance.patch(`/documents/${id}/star`);
      setDocuments(documents.map(d => d._id === id ? response.data : d));
      showToast(response.data.isStarred ? 'Added to starred' : 'Removed from starred', 'success');
    } catch (err) {
      console.error('Failed to toggle star:', err);
      showToast('Failed to toggle star', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Filter documents based on active tab
  const filteredDocuments = documents.filter(d => {
    if (!d) return false;
    if (activeTab === 'documents') return !d.isDeleted;
    if (activeTab === 'starred') return d.isStarred && !d.isDeleted;
    if (activeTab === 'trash') return d.isDeleted;
    return false;
  });

  // Get recent documents sorted by updatedAt (with null checks)
  const recentDocuments = [...filteredDocuments]
    .filter(d => d && d.updatedAt && !d.isDeleted) // Only active recent docs
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return isNaN(dateB) || isNaN(dateA) ? 0 : dateB - dateA;
    })
    .slice(0, 1);

  // Calculate stats (only from active documents)
  const activeDocuments = documents.filter(d => !d?.isDeleted);
  const starredCount = activeDocuments.filter(d => d?.isStarred).length;
  const editedThisWeek = activeDocuments.filter(d => {
    if (!d?.updatedAt) return false;
    const updated = new Date(d.updatedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return !isNaN(updated.getTime()) && updated >= weekAgo;
  }).length;

  // Format date for display
  const getDateString = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">S</span>
            <div className="logo-text">
              <span className="logo-name">SyncDocs</span>
            </div>
          </div>
        </div>

        <button
          className="new-doc-btn"
          onClick={handleCreateDocument}
          disabled={loading}
        >
          <span className="new-doc-icon">✏️</span>
          <span>New document</span>
        </button>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <span className="nav-icon">🏠</span>
            <span>Documents</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'starred' ? 'active' : ''}`}
            onClick={() => setActiveTab('starred')}
          >
            <span className="nav-icon">⭐</span>
            <span>Starred</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'trash' ? 'active' : ''}`}
            onClick={() => setActiveTab('trash')}
          >
            <span className="nav-icon">🗑️</span>
            <span>Trash</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <img src={user?.avatar} alt={user?.name} className="profile-avatar" />
            <span className="profile-name">{user?.name}</span>
          </div>
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <p className="header-date">{getDateString()}</p>
            <h1 className="header-greeting">{getGreeting()}, {user?.name}.</h1>
            <p className="header-subtitle">A quiet place to draft, refine, and ship together.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-info">
              <span className="stat-label">DOCUMENTS</span>
              <span className="stat-value">{documents.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <span className="stat-label">STARRED</span>
              <span className="stat-value">{starredCount}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <span className="stat-label">EDITED THIS WEEK</span>
              <span className="stat-value">{editedThisWeek}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-label">ACTIVE NOW</span>
              <span className="stat-value">0</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <div className="error-message">{error}</div>
            <button className="error-retry" onClick={loadDocuments}>
              Retry
            </button>
          </div>
        )}

        {/* Recent Documents Section - Only show on Documents tab */}
        {!loading && activeTab === 'documents' && recentDocuments.length > 0 && (
          <section className="recent-section">
            <div className="section-header">
              <h2>Jump back in</h2>
            </div>
            <div className="recent-grid">
              {recentDocuments.map((doc) => (
                <DocumentCard
                  key={doc._id}
                  document={doc}
                  onOpen={() => navigate(`/documents/${doc._id}`)}
                  onDelete={() => handleDeleteDocument(doc._id)}
                  onRestore={() => handleRestoreDocument(doc._id)}
                  onStar={() => handleStarDocument(doc._id)}
                  isTrash={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Documents Section */}
        {!loading && filteredDocuments.length > 0 && (
          <section className="all-docs-section">
            <div className="section-header">
              <h2>
                {activeTab === 'documents' && 'All documents'}
                {activeTab === 'starred' && 'Starred documents'}
                {activeTab === 'trash' && 'Trash'}
              </h2>
            </div>
            <div className="documents-grid">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc._id}
                  document={doc}
                  onOpen={() => navigate(`/documents/${doc._id}`)}
                  onDelete={() => handleDeleteDocument(doc._id)}
                  onRestore={() => handleRestoreDocument(doc._id)}
                  onStar={() => handleStarDocument(doc._id)}
                  isTrash={activeTab === 'trash'}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && filteredDocuments.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'documents' && '📄'}
              {activeTab === 'starred' && '⭐'}
              {activeTab === 'trash' && '🗑️'}
            </div>
            <h2>
              {activeTab === 'documents' && 'No documents yet'}
              {activeTab === 'starred' && 'No starred documents'}
              {activeTab === 'trash' && 'Trash is empty'}
            </h2>
            <p>
              {activeTab === 'documents' && 'Create your first collaborative document'}
              {activeTab === 'starred' && 'Star documents to save them for later'}
              {activeTab === 'trash' && 'Deleted documents will appear here'}
            </p>
            {activeTab === 'documents' && (
              <button className="btn-primary" onClick={handleCreateDocument}>
                Create Document
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <section className="all-docs-section">
            <div className="section-header">
              <h2>All documents</h2>
            </div>
            <div className="documents-grid">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
