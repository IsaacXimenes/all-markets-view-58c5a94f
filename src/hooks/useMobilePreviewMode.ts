import { create } from 'zustand';
import { createContext, useContext } from 'react';

interface MobilePreviewState {
  isMobilePreview: boolean;
  toggleMobilePreview: () => void;
  setMobilePreview: (value: boolean) => void;
}

export const useMobilePreviewMode = create<MobilePreviewState>((set) => ({
  isMobilePreview: false,
  toggleMobilePreview: () => set((state) => ({ isMobilePreview: !state.isMobilePreview })),
  setMobilePreview: (value) => set({ isMobilePreview: value }),
}));

// Context para componentes detectarem se estão dentro do mobile preview
export const MobilePreviewContext = createContext(false);

export const useIsMobilePreview = () => useContext(MobilePreviewContext);
