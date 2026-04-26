import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// remove /api for socket
const SOCKET_URL = BASE_URL.replace('/api', '');

export const useSocket = (token, documentId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !documentId) return;

    socketRef.current = io(`${SOCKET_URL}/documents`, {
      transports: ['websocket'],
  
});
    namespace: '/documents',

    socketRef.current.emit('join-document', {
      documentId,
      token,
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [token, documentId]);

  const sendDelta = useCallback((delta, revision) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-delta', {
        documentId,
        delta,
        revision,
      });
    }
  }, [documentId]);

  const updateCursor = useCallback((range) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-move', {
        documentId,
        range,
      });
    }
  }, [documentId]);

  const saveVersion = useCallback((label) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('save-version', {
        documentId,
        label,
      });
    }
  }, [documentId]);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  return {
    socket: socketRef.current,
    sendDelta,
    updateCursor,
    saveVersion,
    on,
    off,
  };
};
