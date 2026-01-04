import { useCallback, useEffect, useRef } from 'react';

interface DraftData {
  data: any;
  timestamp: number;
}

const DRAFT_EXPIRY_MS = 20 * 60 * 1000; // 20 minutos

export const useDraftVenda = (key: string) => {
  const lastSaveRef = useRef<number>(0);
  
  const saveDraft = useCallback((data: any) => {
    const draft: DraftData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(draft));
    lastSaveRef.current = Date.now();
  }, [key]);
  
  const loadDraft = useCallback((): any | null => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      
      const draft: DraftData = JSON.parse(saved);
      const age = Date.now() - draft.timestamp;
      
      if (age > DRAFT_EXPIRY_MS) {
        clearDraft();
        return null; // Expirado
      }
      
      return draft.data;
    } catch {
      return null;
    }
  }, [key]);
  
  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);
  
  const hasDraft = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return false;
      
      const draft: DraftData = JSON.parse(saved);
      const age = Date.now() - draft.timestamp;
      
      if (age > DRAFT_EXPIRY_MS) {
        clearDraft();
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }, [key, clearDraft]);
  
  const getDraftAge = useCallback((): number | null => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      const draft: DraftData = JSON.parse(saved);
      return Math.floor((Date.now() - draft.timestamp) / 1000);
    } catch {
      return null;
    }
  }, [key]);

  const formatDraftAge = useCallback((seconds: number | null): string => {
    if (seconds === null) return '';
    if (seconds < 60) return `${seconds} segundos atrás`;
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minuto atrás';
    return `${minutes} minutos atrás`;
  }, []);
  
  return { 
    saveDraft, 
    loadDraft, 
    clearDraft, 
    hasDraft, 
    getDraftAge,
    formatDraftAge
  };
};

export default useDraftVenda;