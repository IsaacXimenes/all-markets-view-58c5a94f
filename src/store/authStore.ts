import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
}

interface User {
  username: string;
  colaborador?: Colaborador;
}

interface AuthState {
  isAuthenticated: boolean;
  isAnimating: boolean;
  user: User | null;
  login: (username: string, password: string, colaborador?: Colaborador) => boolean;
  logout: () => void;
  setAnimating: (value: boolean) => void;
  setColaborador: (colaborador: Colaborador) => void;
}

// Credenciais de teste
const VALID_USERNAME = '123';
const VALID_PASSWORD = '123';

// Colaborador padrão para o usuário de teste (gestor)
const DEFAULT_COLABORADOR: Colaborador = {
  id: 'COL-GES-001',
  nome: 'João Gestor',
  cargo: 'Gestor'
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isAnimating: false,
      user: null,

      login: (username: string, password: string, colaborador?: Colaborador) => {
        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
          set({ 
            isAuthenticated: true, 
            user: { 
              username, 
              colaborador: colaborador || DEFAULT_COLABORADOR 
            },
            isAnimating: true 
          });
          return true;
        }
        return false;
      },

      logout: () => {
        // Limpar dados de sessão do localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('gestao_conferencia_') ||
            key.startsWith('gestao_ajustes_') ||
            key === 'gestao_logs_auditoria' ||
            key.startsWith('stories_lotes_') ||
            key.startsWith('atividades_execucao_') ||
            key === 'atividades_logs'
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        set({ 
          isAuthenticated: false, 
          user: null,
          isAnimating: false 
        });
      },

      setAnimating: (value: boolean) => {
        set({ isAnimating: value });
      },

      setColaborador: (colaborador: Colaborador) => {
        set((state) => ({
          user: state.user ? { ...state.user, colaborador } : null
        }));
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
