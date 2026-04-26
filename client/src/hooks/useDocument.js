import { useState, useCallback, useEffect } from 'react';
import { documentsAPI, versionsAPI } from '../api';

export const useDocument = (documentId) => {
  const [document, setDocument] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDocument = useCallback(async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const response = await documentsAPI.getById(documentId);
      setDocument(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const loadVersions = useCallback(async () => {
    if (!documentId) return;
    try {
      const response = await versionsAPI.getAll(documentId);
      setVersions(response.data);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  }, [documentId]);

  const updateTitle = useCallback(async (title) => {
    try {
      const response = await documentsAPI.update(documentId, title);
      setDocument(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update title');
      throw err;
    }
  }, [documentId]);

  const deleteDocument = useCallback(async () => {
    try {
      await documentsAPI.delete(documentId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete document');
      throw err;
    }
  }, [documentId]);

  const shareDocument = useCallback(async (email, role) => {
    try {
      const response = await documentsAPI.share(documentId, email, role);
      setDocument(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to share document';
      setError(errorMessage);
      throw err;
    }
  }, [documentId]);

  const generateShareLink = useCallback(async () => {
    try {
      const response = await documentsAPI.generateLink(documentId);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate link');
      throw err;
    }
  }, [documentId]);

  const removeCollaborator = useCallback(async (userId) => {
    try {
      const response = await documentsAPI.removeCollaborator(documentId, userId);
      setDocument(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove collaborator');
      throw err;
    }
  }, [documentId]);

  const saveVersion = useCallback(async (label) => {
    try {
      const response = await versionsAPI.save(documentId, label);
      setVersions([response.data, ...versions]);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save version');
      throw err;
    }
  }, [documentId, versions]);

  const restoreVersion = useCallback(async (versionId) => {
    try {
      const response = await versionsAPI.restore(documentId, versionId);
      setDocument(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to restore version');
      throw err;
    }
  }, [documentId]);

  useEffect(() => {
    loadDocument();
    loadVersions();
  }, [documentId, loadDocument, loadVersions]);

  return {
    document,
    versions,
    loading,
    error,
    updateTitle,
    deleteDocument,
    shareDocument,
    generateShareLink,
    removeCollaborator,
    saveVersion,
    restoreVersion,
    refetchDocument: loadDocument,
  };
};
