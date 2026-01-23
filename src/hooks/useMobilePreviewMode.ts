import { create } from 'zustand';

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
