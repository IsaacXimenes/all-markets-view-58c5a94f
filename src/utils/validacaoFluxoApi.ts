// API de Validação do Fluxo OS/Garantia

import { getGarantiaById, getGarantias, updateGarantia } from './garantiasApi';
import { getOrdensServico, getOrdemServicoById, updateOrdemServico } from './assistenciaApi';

// Interface para problema de validação
export interface ProblemaValidacao {
  tipo: string;
  id: string;
  descricao: string;
  criticidade: 'baixa' | 'media' | 'alta';
}

// Gerar relatório de validação
export const gerarRelatorioValidacao = (): ProblemaValidacao[] => {
  const garantias = getGarantias();
  const problemas: ProblemaValidacao[] = [];
  
  garantias.forEach(g => {
    // Verificar garantias em tratativa por muito tempo
    if (g.status === 'Em Tratativa') {
      const dataInicio = new Date(g.dataInicioGarantia);
      const hoje = new Date();
      const diasEmTratativa = Math.floor((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasEmTratativa > 30) {
        problemas.push({
          tipo: 'Tratativa prolongada',
          id: g.id,
          descricao: `Garantia ${g.id} está em tratativa há ${diasEmTratativa} dias`,
          criticidade: 'alta'
        });
      }
    }
  });
  
  return problemas;
};

// Verificar integridade do fluxo
export const verificarIntegridadeFluxo = (): {
  totalGarantias: number;
  garantiasAtivas: number;
  garantiasEmTratativa: number;
  problemasEncontrados: number;
  status: 'ok' | 'atencao' | 'critico';
} => {
  const garantias = getGarantias();
  const problemas = gerarRelatorioValidacao();
  
  const garantiasAtivas = garantias.filter(g => g.status === 'Ativa').length;
  const garantiasEmTratativa = garantias.filter(g => g.status === 'Em Tratativa').length;
  
  const problemasAltos = problemas.filter(p => p.criticidade === 'alta').length;
  
  let status: 'ok' | 'atencao' | 'critico' = 'ok';
  if (problemasAltos > 0) status = 'critico';
  else if (problemas.length > 0) status = 'atencao';
  
  return {
    totalGarantias: garantias.length,
    garantiasAtivas,
    garantiasEmTratativa,
    problemasEncontrados: problemas.length,
    status
  };
};
