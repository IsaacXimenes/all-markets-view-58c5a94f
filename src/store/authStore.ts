import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  username: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isAnimating: boolean;
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setAnimating: (value: boolean) => void;
}

// Credenciais de teste
const VALID_USERNAME = '123';
const VALID_PASSWORD = '123';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isAnimating: false,
      user: null,

      login: (username: string, password: string) => {
        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
          set({ 
            isAuthenticated: true, 
            user: { username },
            isAnimating: true 
          });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ 
          isAuthenticated: false, 
          user: null,
          isAnimating: false 
        });
      },

      setAnimating: (value: boolean) => {
        set({ isAnimating: value });
      },
    }),
    {
      name: 'thiago-imports-auth',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        user: state.user 
      }),
    }
  )
);
