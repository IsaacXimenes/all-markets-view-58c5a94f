import { useCallback, useSyncExternalStore } from 'react';

const SIDEBAR_STATE_KEY = 'thiago-imports-sidebar-collapsed';

// Funções para sincronização externa
function getSnapshot(): boolean {
  const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
  return stored === 'true';
}

function subscribe(callback: () => void) {
  // Escutar mudanças no localStorage (cross-tab)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SIDEBAR_STATE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  
  // Custom event para mudanças na mesma aba
  window.addEventListener('sidebar-state-change', callback);
  
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('sidebar-state-change', callback);
  };
}

/**
 * Hook para persistir estado do sidebar no localStorage.
 * O estado é sincronizado entre sessões, páginas e navegações.
 * Usa useSyncExternalStore para evitar re-renders desnecessários.
 * 
 * @param defaultCollapsed - Estado padrão (default: false = expandido)
 * @returns [isCollapsed, toggleSidebar] - Estado atual e função de toggle
 */
export function useSidebarState(defaultCollapsed: boolean = false) {
  // Inicializar localStorage se não existir
  if (typeof window !== 'undefined' && localStorage.getItem(SIDEBAR_STATE_KEY) === null) {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(defaultCollapsed));
  }

  // Usar useSyncExternalStore para estado estável entre navegações
  const isCollapsed = useSyncExternalStore(subscribe, getSnapshot, () => defaultCollapsed);
  
  // Toggle do estado
  const toggleSidebar = useCallback(() => {
    const current = localStorage.getItem(SIDEBAR_STATE_KEY) === 'true';
    localStorage.setItem(SIDEBAR_STATE_KEY, String(!current));
    // Disparar evento customizado para atualizar na mesma aba
    window.dispatchEvent(new Event('sidebar-state-change'));
  }, []);
  
  return [isCollapsed, toggleSidebar] as const;
}

export default useSidebarState;
