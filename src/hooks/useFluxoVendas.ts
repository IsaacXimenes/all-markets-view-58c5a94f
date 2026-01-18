import { useState, useEffect, useCallback } from 'react';
import { 
  getVendasComFluxo, 
  getVendasPorStatus, 
  VendaComFluxo, 
  StatusVenda 
} from '@/utils/fluxoVendasApi';

interface UseFluxoVendasOptions {
  status?: StatusVenda | StatusVenda[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  incluirHistorico?: boolean; // Nova opção para incluir vendas finalizadas
}

export const useFluxoVendas = (options: UseFluxoVendasOptions = {}) => {
  const { status, autoRefresh = true, refreshInterval = 2000, incluirHistorico = false } = options;
  const [vendas, setVendas] = useState<VendaComFluxo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarVendas = useCallback(() => {
    try {
      if (status) {
        let vendasFiltradas = getVendasPorStatus(status);
        
        // Se incluirHistorico = true, incluir também vendas já finalizadas
        if (incluirHistorico) {
          const todasVendas = getVendasComFluxo();
          // Adicionar vendas com outros status que não estão no filtro (para histórico)
          const statusArray = Array.isArray(status) ? status : [status];
          const vendasOutrosStatus = todasVendas.filter(v => 
            !statusArray.includes(v.statusFluxo as StatusVenda) &&
            ['Conferência Gestor', 'Conferência Financeiro', 'Finalizado'].includes(v.statusFluxo || '')
          );
          vendasFiltradas = [...vendasFiltradas, ...vendasOutrosStatus];
        }
        
        setVendas(vendasFiltradas);
      } else {
        setVendas(getVendasComFluxo());
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  }, [status, incluirHistorico]);

  useEffect(() => {
    carregarVendas();

    if (autoRefresh) {
      const interval = setInterval(carregarVendas, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [carregarVendas, autoRefresh, refreshInterval]);

  const recarregar = useCallback(() => {
    setLoading(true);
    carregarVendas();
  }, [carregarVendas]);

  // Contadores por status
  const contadores = {
    aguardandoConferencia: vendas.filter(v => v.statusFluxo === 'Aguardando Conferência').length,
    feitoSinal: vendas.filter(v => v.statusFluxo === 'Feito Sinal').length,
    conferenciaGestor: vendas.filter(v => v.statusFluxo === 'Conferência Gestor').length,
    recusadaGestor: vendas.filter(v => v.statusFluxo === 'Recusada - Gestor').length,
    conferenciaFinanceiro: vendas.filter(v => v.statusFluxo === 'Conferência Financeiro').length,
    devolvidoFinanceiro: vendas.filter(v => v.statusFluxo === 'Devolvido pelo Financeiro').length,
    finalizado: vendas.filter(v => v.statusFluxo === 'Finalizado').length,
    total: vendas.length
  };

  return {
    vendas,
    loading,
    recarregar,
    contadores
  };
};

export default useFluxoVendas;
