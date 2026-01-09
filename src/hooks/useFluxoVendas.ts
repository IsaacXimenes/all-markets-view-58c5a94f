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
}

export const useFluxoVendas = (options: UseFluxoVendasOptions = {}) => {
  const { status, autoRefresh = true, refreshInterval = 2000 } = options;
  const [vendas, setVendas] = useState<VendaComFluxo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarVendas = useCallback(() => {
    try {
      if (status) {
        setVendas(getVendasPorStatus(status));
      } else {
        setVendas(getVendasComFluxo());
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  }, [status]);

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
