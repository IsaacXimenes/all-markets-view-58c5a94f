// Mapeamento centralizado de cores de status
// Garante consistência visual em todo o sistema

export type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange';

export interface StatusConfig {
  color: StatusColor;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

// Configurações de cores para badges
const statusConfigs: Record<StatusColor, StatusConfig> = {
  green: {
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-800 dark:text-green-400',
    borderClass: 'border-green-200 dark:border-green-800'
  },
  yellow: {
    color: 'yellow',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-800 dark:text-yellow-400',
    borderClass: 'border-yellow-200 dark:border-yellow-800'
  },
  red: {
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-800 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800'
  },
  blue: {
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-400',
    borderClass: 'border-blue-200 dark:border-blue-800'
  },
  gray: {
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-800 dark:text-gray-300',
    borderClass: 'border-gray-200 dark:border-gray-700'
  },
  purple: {
    color: 'purple',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-800 dark:text-purple-400',
    borderClass: 'border-purple-200 dark:border-purple-800'
  },
  orange: {
    color: 'orange',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-800 dark:text-orange-400',
    borderClass: 'border-orange-200 dark:border-orange-800'
  }
};

// Configurações para linhas de tabela (padrão Movimentações)
const rowConfigs: Record<StatusColor, string> = {
  green: 'bg-green-500/10',
  yellow: 'bg-yellow-500/10',
  red: 'bg-red-500/10',
  blue: 'bg-blue-500/10',
  gray: 'bg-gray-500/10',
  purple: 'bg-purple-500/10',
  orange: 'bg-orange-500/10'
};

// Cor especial para Fiado/Sinal
export const FIADO_ROW_CLASS = 'bg-amber-500/10';

/**
 * Retorna a classe CSS para colorir linha de tabela baseado no status
 */
export const getStatusRowClass = (status: string): string => {
  const color = getStatusColor(status);
  return rowConfigs[color];
};

// Mapeamento de status para cores
const statusColorMap: Record<string, StatusColor> = {
  // Status positivos (verde)
  'Concluída': 'green',
  'Concluído': 'green',
  'Liberado': 'green',
  'Aprovado': 'green',
  'Ativo': 'green',
  'Serviço concluído': 'green',
  'Validado pela assistência': 'green',
  'Análise Realizada – Produto em ótimo estado': 'green',
  'Produto revisado e deferido': 'green',
  'Disponível': 'green',
  'Pago': 'green',
  
  // Status de atenção (amarelo)
  'Pendente': 'yellow',
  'Pendente Estoque': 'yellow',
  'Em Análise': 'yellow',
  'Aguardando': 'yellow',
  'Aguardando Peça': 'yellow',
  'Em análise financeiro': 'yellow',
  'Pendente - Financeiro': 'yellow',
  'Retornado da Assistência': 'yellow',
  'Ajustes realizados': 'yellow',
  'Reservada': 'yellow',
  'À vencer': 'yellow',
  
  // Status negativos (vermelho)
  'Cancelada': 'red',
  'Cancelado': 'red',
  'Rejeitado': 'red',
  'Atrasado': 'red',
  'Vencido': 'red',
  'Inativo': 'red',
  'Utilizada': 'red',
  
  // Status de processo (azul)
  'Em Andamento': 'blue',
  'Em Serviço': 'blue',
  'Em serviço': 'blue',
  'Em Análise Assistência': 'blue',
  'Processando': 'blue',
  'Encaminhado para conferência da Assistência': 'blue',
  'Solicitação Enviada': 'blue',
  'Peça Recebida': 'blue',
  'Agendado': 'blue',
  
  // Status neutros (cinza)
  'Rascunho': 'gray',
  'Arquivado': 'gray',
  'N/A': 'gray',
  
  // Status especiais (roxo)
  'VIP': 'purple',
  'Premium': 'purple',
  'Empréstimo': 'purple',
  
  // Status de alerta moderado (laranja)
  'Baixo Estoque': 'orange',
  'Atenção': 'orange',
  'Retirada de Peças': 'orange',
  
  // Status de aparelho
  'Vendido': 'red',
  'Em movimentação': 'yellow',
  'Bloqueado': 'gray'
};

/**
 * Retorna a cor para um determinado status
 */
export const getStatusColor = (status: string): StatusColor => {
  return statusColorMap[status] || 'gray';
};

/**
 * Retorna as classes CSS para um determinado status
 */
export const getStatusClasses = (status: string): StatusConfig => {
  const color = getStatusColor(status);
  return statusConfigs[color];
};

/**
 * Retorna as classes CSS para usar em um Badge
 */
export const getStatusBadgeClasses = (status: string): string => {
  const config = getStatusClasses(status);
  return `${config.bgClass} ${config.textClass}`;
};

/**
 * Retorna a cor do SLA baseado nos dias
 */
export const getSLAColor = (dias: number): StatusColor => {
  if (dias >= 5) return 'red';
  if (dias >= 3) return 'yellow';
  return 'green';
};

/**
 * Retorna as classes CSS para o SLA
 */
export const getSLAClasses = (dias: number): StatusConfig => {
  const color = getSLAColor(dias);
  return statusConfigs[color];
};

/**
 * Retorna a cor para margem/lucro
 */
export const getMarginColor = (margin: number): StatusColor => {
  if (margin < 0) return 'red';
  if (margin < 20) return 'yellow';
  return 'green';
};

/**
 * Retorna a cor para saúde da bateria
 */
export const getBatteryHealthColor = (health: number): StatusColor => {
  if (health >= 85) return 'green';
  if (health >= 70) return 'yellow';
  return 'red';
};
