import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../context/ToastContext";
import axiosInstance from "../api/axiosInstance";

import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { VersionHistory } from "../components/VersionHistory";
import { ShareModal } from "../components/ShareModal";
import { CollaboratorAvatars } from "../components/CollaboratorAvatars";

import "./Editor.css";

export const Editor = () => {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const token = localStorage.getItem("token");

  const {
    sendDelta,
    updateCursor,
    on,
    off,
  } = useSocket(token, documentId);

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState([]);
  const [title, setTitle] = useState("");
  const [revision, setRevision] = useState(0);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [collaborators, setCollaborators] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const quillRef = useRef(null);
  const lastRevisionRef = useRef(0);
  const titleTimeoutRef = useRef(null);

  // Load document on mount
  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const response = await axiosInstance.get(`/documents/${documentId}`);
      setDocument(response.data);
      setTitle(response.data.title || "");
      setContent(response.data.content || []);
      setRevision(response.data.revision || 0);
      lastRevisionRef.current = response.data.revision || 0;
    } catch (error) {
      console.error('Failed to load document:', error);
      if (error.response?.status === 404) {
        showToast('Document not found', 'error');
        navigate('/dashboard');
      } else if (error.response?.status === 403) {
        showToast('Access denied', 'error');
        navigate('/dashboard');
      } else {
        showToast('Failed to load document', 'error');
      }
    }
  };

  // Socket event listeners
  useEffect(() => {
    on("load-document", (data) => {
      setContent(data.content);
      setRevision(data.revision);
      lastRevisionRef.current = data.revision;
      setCollaborators(data.collaborators);
    });

    on("receive-delta", (data) => {
      const quill = quillRef.current?.getEditor();
      if (quill) {
        quill.updateContents(data.delta, "api");
      }
      setRevision(data.revision);
      lastRevisionRef.current = data.revision;
    });

    on("presence-update", (data) => {
      setCollaborators(data.users);
    });

    on("save-status", (data) => {
      setSaveStatus(data.status || "Saved");
    });

    on("error", (data) => {
      console.error("Socket error:", data.message);
      showToast(data.message || 'Connection error', 'error');
    });

    return () => {
      off("load-document", null);
      off("receive-delta", null);
      off("presence-update", null);
      off("save-status", null);
      off("error", null);
    };
  }, [on, off, showToast]);

  const handleTitleChange = (newTitle) => {
    setTitle(newTitle);
    
    // Clear existing timeout
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    // Set new timeout for save
    titleTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('Saving...');
        await axiosInstance.patch(`/documents/${documentId}`, {
          title: newTitle
        });
        setSaveStatus('Saved');
      } catch (error) {
        console.error('Failed to save title:', error);
        setSaveStatus('Save failed');
        showToast('Failed to save title', 'error');
      }
    }, 1000);
  };

  const handleContentChange = (content, delta, source, editor) => {
    if (source !== "user") return;

    setContent(editor.getContents());
    setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
    sendDelta(delta, lastRevisionRef.current);
  };

  const handleSelectionChange = (range, source, editor) => {
    if (range && source === "user") {
      updateCursor(range);
    }
  };

  const handleGoBack = () => {
    navigate("/dashboard");
  };

  const handleVersionRestore = () => {
    // Reload document content after restore
    loadDocument();
  };

  if (!document) {
    return (
      <div className="editor">
        <Navbar user={user} onLogout={logout} />
        <div className="editor-container">
          <div className="editor-main">
            <div className="loading-editor">Loading document...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor">
      <Navbar user={user} onLogout={logout} />

      <div className="editor-container">
        {sidebarOpen && (
          <Sidebar
            onClose={() => setSidebarOpen(false)}
            currentDocId={documentId}
          />
        )}

        <div className="editor-main">
          <div className="editor-toolbar">
            <div className="toolbar-left">
              <button
                className="btn-ghost"
                onClick={handleGoBack}
                title="Back to dashboard"
              >
                ← Back
              </button>

              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="title-input"
                placeholder="Untitled Document"
              />
            </div>

            <div className="toolbar-center">
              <CollaboratorAvatars collaborators={collaborators} />
            </div>

            <div className="toolbar-right">
              <span className="save-status">
                <span
                  className={`status-indicator ${saveStatus === "Saved" ? "saved" : ""}`}
                />
                {saveStatus}
              </span>

              <button
                className="btn-secondary"
                onClick={() => setShowVersionHistory(true)}
                title="Version history"
              >
                ⏱ History
              </button>

              <button
                className="btn-primary"
                onClick={() => setShowShareModal(true)}
                title="Share document"
              >
                📤 Share
              </button>
            </div>
          </div>

          <div className="editor-content">
            <ReactQuill
              ref={quillRef}
              value={content}
              onChange={handleContentChange}
              onChangeSelection={handleSelectionChange}
              theme="snow"
              modules={{
                toolbar: [
                  ["bold", "italic", "underline", "strike"],
                  ["blockquote", "code-block"],
                  [{ header: 1 }, { header: 2 }],
                  [{ list: "ordered" }, { list: "bullet" }],
                  [{ color: [] }, { background: [] }],
                  ["link", "image"],
                  ["clean"],
                ],
              }}
              placeholder="Start typing..."
            />
          </div>
        </div>
      </div>

      <VersionHistory
        documentId={documentId}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={handleVersionRestore}
      />

      <ShareModal
        documentId={documentId}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};
